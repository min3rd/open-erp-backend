import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository';
import { AuditService } from './audit.service';
import {
  AuditEventType,
  MemberRole,
  OrganizationDocument,
  OrganizationMemberDocument,
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
  ) {}

  /**
   * Get organizations that a user belongs to, with their roles in each org
   */
  async getUserOrgs(
    userId: string,
    options: {
      includeRoles?: boolean;
      includeOrgDetails?: boolean;
    } = {},
  ): Promise<UserOrgItemDto[]> {
    try {
      // Validate userId is a valid ObjectId
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const memberships = await this.memberRepository.findUserOrgsWithDetails(
        userId,
        { includeOrgDetails: options.includeOrgDetails },
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
   * If orgId is provided, returns only permissions for that org plus global
   */
  async getUserRolesPermissions(
    userId: string,
    orgId?: string,
  ): Promise<UserRolesPermissionsResponseDto> {
    try {
      // Validate userId
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
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
   */
  async grantRolesToUserInOrg(
    orgId: string,
    userId: string,
    roles: MemberRole[],
    permissions: string[],
    actorId: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<GrantResult> {
    try {
      // Validate IDs
      if (!Types.ObjectId.isValid(orgId)) {
        throw new BadRequestException('Invalid organization ID format');
      }
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }
      if (!Types.ObjectId.isValid(actorId)) {
        throw new BadRequestException('Invalid actor ID format');
      }

      // Validate organization exists
      const org = await this.organizationRepository.findById(orgId);
      if (!org) {
        throw new NotFoundException(`Organization not found: ${orgId}`);
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

      // Log audit event
      await this.auditService.logEvent(
        AuditEventType.MEMBER_ROLE_GRANTED,
        orgId,
        actorId,
        {
          targetUserId: userId,
          grantedRoles: roles,
          grantedPermissions: permissions,
          membershipId: String(membership._id),
        },
        {
          description: `Roles/permissions granted to user ${userId} in org ${orgId}`,
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        },
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
