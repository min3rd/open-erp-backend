import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository';
import { AuditService } from './audit.service';
import {
  AuditEventType,
  MemberRole,
  OrganizationDocument,
  OrganizationMemberDocument,
  User,
  UserDocument,
  Organization,
} from '@shared/schemas';
import {
  UserOrgItemDto,
  UserRolesPermissionsResponseDto,
  OrgsListQueryDto,
} from '../dto/org-admin.dto';
import { Permission, isValidPermission } from '@shared/types/permission.enum';

/**
 * Result type for grant operation
 */
interface GrantResult {
  id: string;
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  status: string;
}

/**
 * Service for organization admin operations
 * - Get user organizations with roles
 * - Get user roles and permissions (global + per-org)
 * - Grant roles/permissions to users in orgs
 * - List all organizations with pagination
 */
@Injectable()
export class OrgAdminService {
  private readonly logger = new Logger(OrgAdminService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly memberRepository: OrganizationMemberRepository,
    private readonly auditService: AuditService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Resolve user identifier (userId, email, or username) to userId
   * @param identifier - Can be userId, email, or username
   * @returns The resolved userId
   */
  async resolveUserIdentifier(identifier: string): Promise<string> {
    // Email regex pattern from User schema
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // First, check if it's a valid ObjectId
    if (Types.ObjectId.isValid(identifier)) {
      const user = await this.userModel.findById(identifier).exec();
      if (user) {
        return user._id.toHexString();
      }
      // Valid ObjectId format but no user found - throw immediately
      throw new NotFoundException(`User not found with ID: ${identifier}`);
    }

    // Check if it's a valid email format
    if (emailPattern.test(identifier)) {
      const user = await this.userModel
        .findOne({ email: identifier.toLowerCase() })
        .exec();
      if (user) {
        return user._id.toHexString();
      }
      throw new NotFoundException(`User not found with email: ${identifier}`);
    }

    // Try to find by username
    const user = await this.userModel.findOne({ username: identifier }).exec();
    if (user) {
      return user._id.toHexString();
    }

    throw new NotFoundException(`User not found with username: ${identifier}`);
  }

  /**
   * Resolve organization identifier (orgId or taxId) to orgId
   * @param identifier - Can be orgId or taxId
   * @returns The resolved orgId
   */
  async resolveOrgIdentifier(identifier: string): Promise<string> {
    // First, check if it's a valid ObjectId
    if (Types.ObjectId.isValid(identifier)) {
      const org = await this.organizationModel.findById(identifier).exec();
      if (org) {
        return org._id.toHexString();
      }
      // Valid ObjectId format but no org found - throw immediately
      throw new NotFoundException(
        `Organization not found with ID: ${identifier}`,
      );
    }

    // Try to find by taxId
    const org = await this.organizationModel
      .findOne({ taxId: identifier })
      .exec();
    if (org) {
      return org._id.toHexString();
    }

    throw new NotFoundException(
      `Organization not found with taxId: ${identifier}`,
    );
  }

  /**
   * Get organizations that a user belongs to, with their roles in each org
   * @param userIdentifier - Can be userId, email, or username
   */
  async getUserOrgs(
    userIdentifier: string,
    options: {
      includeRoles?: boolean;
      includeOrgDetails?: boolean;
    } = {},
  ): Promise<UserOrgItemDto[]> {
    try {
      // Resolve user identifier to userId
      const userId = await this.resolveUserIdentifier(userIdentifier);

      const memberships = await this.memberRepository.findUserOrgsWithDetails(
        userId,
        { includeOrgDetails: options.includeOrgDetails },
      );

      // Debug log for troubleshooting
      this.logger.debug(
        `User orgs retrieved for user ${userId} (identifier: ${userIdentifier})`,
      );

      return memberships.map((membership) => {
        const orgDoc = membership.organizationId;
        const isPopulated =
          options.includeOrgDetails && orgDoc && typeof orgDoc === 'object';

        // Handle populated vs non-populated organizationId
        // When not populated, organizationId is a mongoose ObjectId
        let orgIdStr: string;
        if (isPopulated) {
          const populatedOrg = orgDoc as unknown as { _id: Types.ObjectId };
          orgIdStr = populatedOrg._id.toHexString();
        } else {
          // When not populated, it's a Schema.Types.ObjectId
          const objectId = orgDoc as unknown as Types.ObjectId;
          orgIdStr = objectId.toHexString();
        }

        // Cast membership to access optional createdAt from Document
        const membershipDoc = membership as OrganizationMemberDocument & {
          createdAt?: Date;
        };
        const joinedAt = membership.joinedAt || membershipDoc.createdAt;

        const item: UserOrgItemDto = {
          orgId: orgIdStr,
          joinedAt: joinedAt || new Date(),
          membershipMeta: {
            isPrimary: membership.isPrimaryOwner,
          },
        };

        if (options.includeOrgDetails && isPopulated) {
          const populatedOrg = orgDoc as unknown as {
            taxId?: string;
            name?: string;
          };
          item.orgCode = populatedOrg.taxId;
          item.orgName = populatedOrg.name;
        }

        if (options.includeRoles !== false) {
          item.roles = membership.roles;
          // Access permissions field (added to schema)
          const membershipWithPerms =
            membership as OrganizationMemberDocument & {
              permissions?: string[];
            };
          item.permissions = membershipWithPerms.permissions || [];
        }

        return item;
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error getting user orgs: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get roles and permissions for a user - both global and per-org
   * If orgIdentifier is provided, returns only permissions for that org plus global
   * @param userIdentifier - Can be userId, email, or username
   * @param orgIdentifier - Can be orgId or taxId (optional)
   */
  async getUserRolesPermissions(
    userIdentifier: string,
    orgIdentifier?: string,
  ): Promise<UserRolesPermissionsResponseDto> {
    try {
      // Resolve user identifier to userId
      const userId = await this.resolveUserIdentifier(userIdentifier);

      // Resolve org identifier if provided
      let orgId: string | undefined;
      if (orgIdentifier) {
        orgId = await this.resolveOrgIdentifier(orgIdentifier);
      }

      // Get all memberships for the user
      const memberships = await this.memberRepository.findByUserId(userId);

      const result: UserRolesPermissionsResponseDto = {
        globalRoles: [],
        globalPermissions: [],
        orgRoles: {},
        orgPermissions: {},
      };

      // TODO: Fetch global roles from User document if needed
      // For now, we only handle organization-level roles/permissions from memberships

      // Process memberships
      for (const membership of memberships) {
        // Get organization ID as hex string
        const orgIdObj = membership.organizationId as unknown as Types.ObjectId;
        const memberOrgId = orgIdObj.toHexString();

        // Skip if orgId filter is provided and doesn't match
        if (orgId && memberOrgId !== orgId) {
          continue;
        }

        result.orgRoles[memberOrgId] = membership.roles || [];
        // Access permissions from membership
        const membershipWithPerms = membership as OrganizationMemberDocument & {
          permissions?: string[];
        };
        result.orgPermissions[memberOrgId] =
          membershipWithPerms.permissions || [];
      }

      // Debug log for troubleshooting
      this.logger.debug(
        `User roles/permissions retrieved for user ${userId} (identifier: ${userIdentifier})`,
      );

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error getting user roles/permissions: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Grant roles and/or permissions to a user in an organization
   * @param orgIdentifier - Can be orgId or taxId
   * @param userIdentifier - Can be userId, email, or username
   */
  async grantRolesToUserInOrg(
    orgIdentifier: string,
    userIdentifier: string,
    roles: MemberRole[],
    permissions: string[],
    actorId: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<GrantResult> {
    try {
      // Resolve identifiers (this also validates they exist)
      const orgId = await this.resolveOrgIdentifier(orgIdentifier);
      const userId = await this.resolveUserIdentifier(userIdentifier);

      // Validate actor ID
      if (!Types.ObjectId.isValid(actorId)) {
        throw new BadRequestException('Invalid actor ID format');
      }

      // Validate roles are valid MemberRole enum values
      const validRoles = Object.values(MemberRole);
      if (roles && roles.length > 0) {
        for (const role of roles) {
          if (!validRoles.includes(role)) {
            throw new BadRequestException(`Invalid role: ${role}`);
          }
        }
      }

      // Validate permissions are valid permission strings
      if (permissions && permissions.length > 0) {
        for (const perm of permissions) {
          if (!isValidPermission(perm)) {
            throw new BadRequestException(`Invalid permission: ${perm}`);
          }
        }
      }

      // Upsert membership with roles and permissions
      const membership = await this.memberRepository.upsertMembership(
        orgId,
        userId,
        roles || [],
        permissions || [],
        new Types.ObjectId(actorId),
      );

      // Log audit event with more details
      await this.auditService.logEvent(
        AuditEventType.MEMBER_ROLE_GRANTED,
        orgId,
        actorId,
        {
          targetUserId: userId,
          targetUserIdentifier: userIdentifier,
          organizationIdentifier: orgIdentifier,
          grantedRoles: roles,
          grantedPermissions: permissions,
          membershipId: String(membership._id),
        },
        {
          description: `Roles/permissions granted to user ${userIdentifier} (${userId}) in org ${orgIdentifier} (${orgId})`,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
      );

      // Debug log for troubleshooting
      this.logger.debug(
        `Grant operation completed: user=${userIdentifier}, org=${orgIdentifier}, roles=${roles?.join(',') || 'none'}, permissions=${permissions?.join(',') || 'none'}`,
      );

      // Access permissions from membership
      const membershipWithPerms = membership as OrganizationMemberDocument & {
        permissions?: string[];
      };

      // Convert IDs to hex strings
      const membershipIdObj = membership._id as unknown as Types.ObjectId;
      const orgIdObj = membership.organizationId as unknown as Types.ObjectId;
      const userIdObj = membership.userId as unknown as Types.ObjectId;

      return {
        id: membershipIdObj.toHexString(),
        organizationId: orgIdObj.toHexString(),
        userId: userIdObj.toHexString(),
        roles: membership.roles,
        permissions: membershipWithPerms.permissions || [],
        status: membership.status,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error granting roles to user in org: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * List all organizations with pagination, search, and sorting
   */
  async listOrgs(query: OrgsListQueryDto): Promise<{
    items: OrganizationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Parse sort string (e.g., "createdAt:desc")
      let sort: { field: string; order: 'asc' | 'desc' } | undefined;
      if (query.sort) {
        const [field, order] = query.sort.split(':');
        if (field && (order === 'asc' || order === 'desc')) {
          sort = { field, order };
        }
      }

      return await this.organizationRepository.listWithPagination({
        q: query.q,
        page: query.page || 1,
        limit: query.limit || 50,
        sort,
        type: query.orgType,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error listing organizations: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Check if user has permission to access another user's org data
   * This is used for authorization checks in controllers
   */
  async canAccessUserOrgData(
    callerId: string,
    targetUserId: string,
    orgId?: string,
  ): Promise<boolean> {
    // Same user can always access their own data
    if (callerId === targetUserId) {
      return true;
    }

    // If orgId is specified, check if caller has MANAGE_ORG_USERS in that org
    if (orgId) {
      const callerMembership =
        await this.memberRepository.findByOrganizationAndUser(orgId, callerId);
      if (callerMembership) {
        const membershipWithPerms =
          callerMembership as OrganizationMemberDocument & {
            permissions?: string[];
          };
        const callerPermissions = membershipWithPerms.permissions || [];
        if (callerPermissions.includes(Permission.MANAGE_ORG_USERS)) {
          // Also verify target user is in the same org
          const targetMembership =
            await this.memberRepository.findByOrganizationAndUser(
              orgId,
              targetUserId,
            );
          return !!targetMembership;
        }
      }
    }

    // Caller with global MANAGE_USERS_AND_ORGS can access any user's data
    // This check should be done via PermissionsGuard at controller level
    return false;
  }

  /**
   * Check if user has permission to manage users in an org
   */
  async canManageOrgUsers(callerId: string, orgId: string): Promise<boolean> {
    const membership = await this.memberRepository.findByOrganizationAndUser(
      orgId,
      callerId,
    );
    if (!membership) {
      return false;
    }

    const membershipWithPerms = membership as OrganizationMemberDocument & {
      permissions?: string[];
    };
    const permissions = membershipWithPerms.permissions || [];
    return (
      permissions.includes(Permission.MANAGE_ORG_USERS) ||
      permissions.includes(Permission.MANAGE_USERS_AND_ORGS)
    );
  }
}
