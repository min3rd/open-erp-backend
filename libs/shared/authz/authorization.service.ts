import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Role, RoleDocument } from '../schemas/role.schema';
import { PermissionScope } from '../authz/decorators';

/**
 * Options for permission checking
 */
export interface PermissionCheckOptions {
  scope?: PermissionScope;
  tenantId?: string | MongooseSchema.Types.ObjectId;
}

/**
 * Enhanced Authorization Service
 * Provides scope-aware permission checking for both global and tenant contexts
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Check if a user has a specific permission with scope awareness
   * @param userId - User ID to check
   * @param permission - Permission string (e.g., 'user.create')
   * @param options - Options including scope and tenantId
   * @returns Promise<boolean> - true if user has permission
   */
  async hasPermission(
    userId: string | MongooseSchema.Types.ObjectId,
    permission: string,
    options?: PermissionCheckOptions,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return false;
      }

      const scope = options?.scope || 'tenant';
      const tenantId = options?.tenantId || user.tenantId;

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

      // Step 2: Get effective permissions based on scope
      const effectivePermissions = await this.getEffectivePermissions(
        user,
        scope,
        tenantId,
      );

      // Step 3: Check if permission is in aggregated list
      const hasPermission = effectivePermissions.includes(permission);

      if (hasPermission) {
        this.logger.debug(
          `Permission '${permission}' granted via roles for user ${userId} (scope: ${scope})`,
        );
      } else {
        this.logger.debug(
          `Permission '${permission}' denied for user ${userId} (scope: ${scope})`,
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
   * @param options - Options including scope and tenantId
   * @returns Promise<boolean> - true if user has at least one permission
   */
  async hasAnyPermission(
    userId: string | MongooseSchema.Types.ObjectId,
    permissions: string[],
    options?: PermissionCheckOptions,
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission, options)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions
   * @param userId - User ID to check
   * @param permissions - Array of permission strings
   * @param options - Options including scope and tenantId
   * @returns Promise<boolean> - true if user has all permissions
   */
  async hasAllPermissions(
    userId: string | MongooseSchema.Types.ObjectId,
    permissions: string[],
    options?: PermissionCheckOptions,
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission, options))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all effective permissions for a user with scope awareness
   * Aggregates permissions from:
   * 1. Special permissions directly assigned to user
   * 2. Global roles assigned to user (if scope is 'global' or not specified)
   * 3. Tenant roles assigned to user (if scope is 'tenant' and role.tenantId matches)
   *
   * @param user - User document or ID
   * @param scope - Permission scope ('global' or 'tenant')
   * @param tenantId - Optional tenant ID (defaults to user's tenantId)
   * @returns Promise<string[]> - Array of unique permissions
   */
  async getEffectivePermissions(
    user: UserDocument | string | MongooseSchema.Types.ObjectId,
    scope: PermissionScope = 'tenant',
    tenantId?: string | MongooseSchema.Types.ObjectId,
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

      // Determine the effective tenantId
      const effectiveTenantId = tenantId || userDoc.tenantId;

      // Filter and aggregate permissions based on scope:
      for (const role of roles) {
        if (scope === 'global') {
          // Global scope: only include global roles
          if (role.scope === 'global') {
            role.permissions.forEach((p) => permissions.add(p));
          }
        } else {
          // Tenant scope: include both global roles and matching tenant roles
          if (role.scope === 'global') {
            role.permissions.forEach((p) => permissions.add(p));
          } else if (
            role.scope === 'tenant' &&
            role.tenantId &&
            effectiveTenantId &&
            role.tenantId.toString() === effectiveTenantId.toString()
          ) {
            role.permissions.forEach((p) => permissions.add(p));
          }
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
   * Check if a user has a specific role
   * @param userId - User ID to check
   * @param roleCode - Role code (e.g., 'SYSTEM_ADMIN', 'TENANT_ADMIN')
   * @returns Promise<boolean> - true if user has the role
   */
  async hasRole(
    userId: string | MongooseSchema.Types.ObjectId,
    roleCode: string,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return false;
      }

      const roleIds = user.roleAssignments.map((ra) => ra.roleId);

      if (roleIds.length === 0) {
        return false;
      }

      const role = await this.roleModel
        .findOne({
          _id: { $in: roleIds as any },
          code: roleCode,
          status: 'active',
        })
        .exec();

      return !!role;
    } catch (error) {
      this.logger.error(
        `Error checking role '${roleCode}' for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check if a user has any of the specified roles
   * @param userId - User ID to check
   * @param roleCodes - Array of role codes
   * @returns Promise<boolean> - true if user has at least one role
   */
  async hasAnyRole(
    userId: string | MongooseSchema.Types.ObjectId,
    roleCodes: string[],
  ): Promise<boolean> {
    for (const roleCode of roleCodes) {
      if (await this.hasRole(userId, roleCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user is a system admin (has global SYSTEM_ADMIN role)
   * @param userId - User ID to check
   * @returns Promise<boolean> - true if user is system admin
   */
  async isSystemAdmin(
    userId: string | MongooseSchema.Types.ObjectId,
  ): Promise<boolean> {
    return this.hasRole(userId, 'SYSTEM_ADMIN');
  }

  /**
   * Check if a user is a tenant admin for a specific tenant
   * @param userId - User ID to check
   * @param tenantId - Optional tenant ID (defaults to user's tenantId)
   * @returns Promise<boolean> - true if user is tenant admin
   */
  async isTenantAdmin(
    userId: string | MongooseSchema.Types.ObjectId,
    tenantId?: string | MongooseSchema.Types.ObjectId,
  ): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        return false;
      }

      const effectiveTenantId = tenantId || user.tenantId;

      if (!effectiveTenantId) {
        return false;
      }

      const roleIds = user.roleAssignments.map((ra) => ra.roleId);

      if (roleIds.length === 0) {
        return false;
      }

      const role = await this.roleModel
        .findOne({
          _id: { $in: roleIds as any },
          code: 'TENANT_ADMIN',
          scope: 'tenant',
          tenantId: effectiveTenantId,
          status: 'active',
        })
        .exec();

      return !!role;
    } catch (error) {
      this.logger.error(
        `Error checking tenant admin for user ${userId}: ${error.message}`,
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
