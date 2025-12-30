import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role, RoleDocument } from '../schemas/role.schema';

/**
 * Service for resolving effective permissions for users
 * Implements the permission checking logic as specified:
 * 1. Check user's special permissions
 * 2. Aggregate permissions from all assigned roles (global + tenant-scoped)
 * 3. Return whether permission is granted
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Check if a user has a specific permission
   * @param userId - User ID to check
   * @param permission - Permission string (e.g., 'user.create')
   * @returns Promise<boolean> - true if user has permission
   */
  async hasPermission(
    userId: string | MongooseSchema.Types.ObjectId,
    permission: string,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return false;
      }

      // Step 1: Check special permissions
      if (
        user.specialPermissions &&
        user.specialPermissions.includes(permission)
      ) {
        this.logger.debug(
          `Permission '${permission}' granted via special permissions for user ${userId}`,
        );
        return true;
      }

      // Step 2: Get effective permissions from roles
      const effectivePermissions = await this.getEffectivePermissions(user);

      // Step 3: Check if permission is in aggregated list
      const hasPermission = effectivePermissions.includes(permission);

      if (hasPermission) {
        this.logger.debug(
          `Permission '${permission}' granted via roles for user ${userId}`,
        );
      } else {
        this.logger.debug(
          `Permission '${permission}' denied for user ${userId}`,
        );
      }

      return hasPermission;
    } catch (error) {
      this.logger.error(
        `Error checking permission '${permission}' for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a user has any of the specified permissions
   * @param userId - User ID to check
   * @param permissions - Array of permission strings
   * @returns Promise<boolean> - true if user has at least one permission
   */
  async hasAnyPermission(
    userId: string | MongooseSchema.Types.ObjectId,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions
   * @param userId - User ID to check
   * @param permissions - Array of permission strings
   * @returns Promise<boolean> - true if user has all permissions
   */
  async hasAllPermissions(
    userId: string | MongooseSchema.Types.ObjectId,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all effective permissions for a user
   * Aggregates permissions from:
   * 1. Special permissions directly assigned to user
   * 2. Global roles assigned to user
   * 3. Tenant roles assigned to user (where role.tenantId matches user.tenantId)
   *
   * @param user - User document or ID
   * @returns Promise<string[]> - Array of unique permissions
   */
  async getEffectivePermissions(
    user: UserDocument | string | MongooseSchema.Types.ObjectId,
  ): Promise<string[]> {
    try {
      let userDoc: UserDocument | null;

      if (
        typeof user === 'string' ||
        user instanceof MongooseSchema.Types.ObjectId
      ) {
        userDoc = await this.userModel.findById(user).exec();
        if (!userDoc) {
          this.logger.warn(`User not found: ${user}`);
          return [];
        }
      } else {
        userDoc = user;
      }

      const permissions = new Set<string>();

      // Add special permissions
      if (userDoc.specialPermissions) {
        userDoc.specialPermissions.forEach((p) => permissions.add(p));
      }

      // Get all role IDs from user's role assignments
      const roleIds = userDoc.roleAssignments.map((ra) => ra.roleId);

      if (roleIds.length === 0) {
        return Array.from(permissions);
      }

      // Fetch all assigned roles
      const roles = await this.roleModel
        .find({
          _id: { $in: roleIds as any },
          status: 'active',
        })
        .exec();

      // Filter and aggregate permissions:
      // - Include all global roles' permissions
      // - Include only tenant roles that match user's tenantId (if user has a tenant)
      for (const role of roles) {
        if (role.scope === 'global') {
          // Global roles apply across all tenants
          role.permissions.forEach((p) => permissions.add(p));
        } else if (
          role.scope === 'tenant' &&
          role.tenantId &&
          userDoc.tenantId &&
          role.tenantId.toString() === userDoc.tenantId.toString()
        ) {
          // Tenant roles only apply if they match user's tenant
          role.permissions.forEach((p) => permissions.add(p));
        }
      }

      return Array.from(permissions);
    } catch (error) {
      this.logger.error(
        `Error getting effective permissions for user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all roles assigned to a user with their details
   * @param userId - User ID
   * @returns Promise of role assignments with role details
   */
  async getUserRolesWithDetails(
    userId: string | MongooseSchema.Types.ObjectId,
  ): Promise<
    Array<{
      role: RoleDocument;
      departmentId?: MongooseSchema.Types.ObjectId | string;
      grantedAt: Date;
      grantedBy?: MongooseSchema.Types.ObjectId | string;
    }>
  > {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return [];
      }

      const roleIds = user.roleAssignments.map((ra) => ra.roleId);

      if (roleIds.length === 0) {
        return [];
      }

      const roles = await this.roleModel
        .find({
          _id: { $in: roleIds as any },
        })
        .exec();

      // Map roles to their assignments
      return user.roleAssignments
        .map((assignment) => {
          const role = roles.find(
            (r) => r._id.toString() === assignment.roleId.toString(),
          );
          if (role) {
            return {
              role,
              departmentId: assignment.departmentId,
              grantedAt: assignment.grantedAt,
              grantedBy: assignment.grantedBy,
            };
          }
          return null;
        })
        .filter((item) => item !== null) as Array<{
        role: RoleDocument;
        departmentId?: MongooseSchema.Types.ObjectId | string;
        grantedAt: Date;
        grantedBy?: MongooseSchema.Types.ObjectId | string;
      }>;
    } catch (error) {
      this.logger.error(
        `Error getting user roles with details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
