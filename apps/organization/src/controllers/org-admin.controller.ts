import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrgAdminService } from '../services/org-admin.service';
import {
  UserOrgsQueryDto,
  UserRolesPermissionsQueryDto,
  GrantOrgRoleDto,
  OrgsListQueryDto,
} from '../dto/org-admin.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';
import { Permission } from '@shared/types/permission.enum';
import { ok, fetched, updated, paginated } from '@shared/response';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
  ip?: string;
  headers?: {
    'user-agent'?: string;
  };
}

@ApiTags('org-admin')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class OrgAdminController {
  constructor(private readonly orgAdminService: OrgAdminService) {}

  /**
   * GET /orgs/user/:identifier
   * Returns organizations the user belongs to along with role(s) per org
   * Identifier can be userId, email, or username
   */
  @Get('orgs/user/:identifier')
  @ApiOperation({
    summary: 'Get organizations of a user with their roles',
    description:
      'Returns organizations the user belongs to along with role(s) per org and membership metadata. Accepts userId, email, or username as identifier.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier: userId, email, or username',
  })
  @ApiQuery({
    name: 'includeRoles',
    required: false,
    type: Boolean,
    description: 'Include roles in response',
  })
  @ApiQuery({
    name: 'includeOrgDetails',
    required: false,
    type: Boolean,
    description: 'Include organization details in response',
  })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', nullable: true },
        error: { type: 'null' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              orgId: { type: 'string', example: 'org_123' },
              orgCode: { type: 'string', example: 'ACME' },
              orgName: { type: 'string', example: 'Acme Co' },
              roles: {
                type: 'array',
                items: { type: 'string' },
                example: ['owner', 'admin'],
              },
              joinedAt: {
                type: 'string',
                format: 'date-time',
                example: '2026-01-01T12:00:00Z',
              },
              membershipMeta: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Manager' },
                  isPrimary: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS],
    { mode: 'any' },
  )
  async getUserOrgs(
    @Param('identifier') identifier: string,
    @Query() query: UserOrgsQueryDto,
  ) {
    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const orgs = await this.orgAdminService.getUserOrgs(identifier, {
      includeRoles: query.includeRoles,
      includeOrgDetails: query.includeOrgDetails,
    });

    return ok(orgs, 'User organizations retrieved successfully');
  }

  /**
   * GET /users/:identifier/roles-permissions
   * Returns effective roles and permissions for a user (global + per-org)
   * Identifier can be userId, email, or username
   */
  @Get('users/:identifier/roles-permissions')
  @ApiOperation({
    summary: 'Get roles and permissions for a user',
    description:
      'Returns effective role and permission sets for user — both global and per org. Accepts userId, email, or username as identifier.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier: userId, email, or username',
  })
  @ApiQuery({
    name: 'orgId',
    required: false,
    description:
      'Filter by organization identifier (orgId or taxId) - returns permissions scoped to that org plus global',
  })
  @ApiResponse({
    status: 200,
    description: 'User roles and permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', nullable: true },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            globalRoles: {
              type: 'array',
              items: { type: 'string' },
              example: ['SUPER_ADMIN'],
            },
            globalPermissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['organization.manage_users_and_orgs', 'system.admin'],
            },
            orgRoles: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
              example: { org_123: ['owner'], org_456: ['member'] },
            },
            orgPermissions: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
              example: {
                org_123: ['organization.manage_org_users', 'warehouse.manage'],
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS],
    { mode: 'any' },
  )
  async getUserRolesPermissions(
    @Param('identifier') identifier: string,
    @Query() query: UserRolesPermissionsQueryDto,
  ) {
    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const result = await this.orgAdminService.getUserRolesPermissions(
      identifier,
      query.orgId,
    );

    return fetched(result, 'User roles and permissions retrieved successfully');
  }

  /**
   * POST /orgs/:orgIdentifier/members/:userIdentifier/grant
   * Grant roles and/or permissions to a user in an organization
   * Identifiers can be orgId/taxId and userId/email/username
   */
  @Post('orgs/:orgIdentifier/members/:userIdentifier/grant')
  @ApiOperation({
    summary: 'Grant roles/permissions to a user in an org',
    description:
      'Grant role(s) or permission(s) to a user in an organization. Requires MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS permission. Accepts orgId/taxId and userId/email/username as identifiers.',
  })
  @ApiParam({
    name: 'orgIdentifier',
    description: 'Organization identifier: orgId or taxId',
  })
  @ApiParam({
    name: 'userIdentifier',
    description: 'User identifier: userId, email, or username',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles/permissions granted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Roles/permissions granted successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                organizationId: { type: 'string' },
                userId: { type: 'string' },
                roles: { type: 'array', items: { type: 'string' } },
                permissions: { type: 'array', items: { type: 'string' } },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid role/permission' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization or user not found' })
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS],
    { mode: 'any' },
  )
  async grantRolesToUser(
    @Param('orgIdentifier') orgIdentifier: string,
    @Param('userIdentifier') userIdentifier: string,
    @Body() grantDto: GrantOrgRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Validate at least one of roles or permissions is provided
    const hasRoles = grantDto.roles && grantDto.roles.length > 0;
    const hasPermissions =
      grantDto.permissions && grantDto.permissions.length > 0;
    if (!hasRoles && !hasPermissions) {
      throw new BadRequestException(
        'At least one of roles or permissions must be provided',
      );
    }

    const actorId = grantDto.actorId || req.user.userId;

    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const membership = await this.orgAdminService.grantRolesToUserInOrg(
      orgIdentifier,
      userIdentifier,
      grantDto.roles || [],
      grantDto.permissions || [],
      actorId,
      {
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'],
      },
    );

    return updated(membership, 'Roles/permissions granted successfully');
  }

  /**
   * GET /orgs
   * List all organizations with pagination, search, and sort
   */
  @Get('orgs')
  @ApiOperation({
    summary: 'List all organizations',
    description:
      'Admin API to list all organizations with paging, filtering and sorting.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by name or taxId',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 50, max: 100)',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort field and order (e.g., createdAt:desc, name:asc)',
  })
  @ApiQuery({
    name: 'orgType',
    required: false,
    enum: ['holding', 'company', 'joint-venture', 'partner', 'branch'],
    description: 'Filter by organization type',
  })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', nullable: true },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                description: 'Organization object',
              },
            },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 50 },
            total: { type: 'number', example: 1234 },
            totalPages: { type: 'number', example: 25 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.ORGANIZATION_READ],
    { mode: 'any' },
  )
  async listOrgs(@Query() query: OrgsListQueryDto) {
    const result = await this.orgAdminService.listOrgs(query);

    return paginated(
      result.items,
      result.page,
      result.limit,
      result.total,
      {
        query: { q: query.q },
        sort: query.sort
          ? {
              by: query.sort.split(':')[0],
              order: (query.sort.split(':')[1] as 'asc' | 'desc') || 'desc',
            }
          : undefined,
      },
      'Organizations retrieved successfully',
    );
  }

  /**
   * GET /orgs/roles
   * Returns all available organization roles
   */
  @Get('orgs/roles')
  @ApiOperation({
    summary: 'Get all organization roles',
    description:
      'Returns a list of all available organization-specific roles (e.g., ORG_OWNER, ORG_MEMBER, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Organization roles retrieved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'ORGANIZATION_ADMIN' },
              name: { type: 'string', example: 'Organization Admin' },
              description: {
                type: 'string',
                example: 'Organization administrator',
              },
              scope: { type: 'string', example: 'organization' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrganizationRoles() {
    // Organization-scoped roles
    const orgRoles = [
      {
        code: 'ORGANIZATION_ADMIN',
        name: 'Organization Admin',
        description: 'Organization administrator with full control',
        scope: 'organization',
      },
      {
        code: 'TENANT_ADMIN',
        name: 'Tenant Admin',
        description: 'Tenant administrator (legacy)',
        scope: 'organization',
      },
      {
        code: 'MANAGER',
        name: 'Manager',
        description: 'Department or team manager',
        scope: 'organization',
      },
      {
        code: 'USER',
        name: 'User',
        description: 'Standard organization member',
        scope: 'organization',
      },
    ];

    return ok(orgRoles, 'Organization roles retrieved successfully');
  }

  /**
   * GET /orgs/permissions
   * Returns all available organization permissions
   */
  @Get('orgs/permissions')
  @ApiOperation({
    summary: 'Get all organization permissions',
    description:
      'Returns a list of all available organization-specific permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Organization permissions retrieved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'organization.manage_org_users' },
              resource: { type: 'string', example: 'organization' },
              action: { type: 'string', example: 'manage_org_users' },
              name: { type: 'string', example: 'Manage Org Users' },
              description: {
                type: 'string',
                example: 'Manage users within an organization',
              },
              scope: { type: 'string', example: 'organization' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrganizationPermissions() {
    // Organization-scoped permissions
    const orgPermissions = [
      {
        code: Permission.ORGANIZATION_CREATE,
        resource: 'organization',
        action: 'create',
        name: 'Create Organization',
        description: 'Permission to create organizations',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_READ,
        resource: 'organization',
        action: 'read',
        name: 'Read Organization',
        description: 'Permission to view organization information',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_UPDATE,
        resource: 'organization',
        action: 'update',
        name: 'Update Organization',
        description: 'Permission to update organization information',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_DELETE,
        resource: 'organization',
        action: 'delete',
        name: 'Delete Organization',
        description: 'Permission to delete organizations',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_MANAGE,
        resource: 'organization',
        action: 'manage',
        name: 'Manage Organization',
        description: 'Full organization management permissions',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_INVITE,
        resource: 'organization',
        action: 'invite',
        name: 'Invite Users',
        description: 'Permission to invite users to organization',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_MEMBER_UPDATE,
        resource: 'organization',
        action: 'member.update',
        name: 'Update Members',
        description: 'Permission to update member roles and status',
        scope: 'organization',
      },
      {
        code: Permission.ORGANIZATION_MEMBER_REMOVE,
        resource: 'organization',
        action: 'member.remove',
        name: 'Remove Members',
        description: 'Permission to remove members from organization',
        scope: 'organization',
      },
      {
        code: Permission.MANAGE_ORG_USERS,
        resource: 'organization',
        action: 'manage_org_users',
        name: 'Manage Org Users',
        description: 'Manage users within an organization',
        scope: 'organization',
      },
      {
        code: Permission.DEPARTMENT_CREATE,
        resource: 'department',
        action: 'create',
        name: 'Create Department',
        description: 'Permission to create departments',
        scope: 'organization',
      },
      {
        code: Permission.DEPARTMENT_READ,
        resource: 'department',
        action: 'read',
        name: 'Read Department',
        description: 'Permission to view department information',
        scope: 'organization',
      },
      {
        code: Permission.DEPARTMENT_UPDATE,
        resource: 'department',
        action: 'update',
        name: 'Update Department',
        description: 'Permission to update departments',
        scope: 'organization',
      },
      {
        code: Permission.DEPARTMENT_DELETE,
        resource: 'department',
        action: 'delete',
        name: 'Delete Department',
        description: 'Permission to delete departments',
        scope: 'organization',
      },
      {
        code: Permission.DEPARTMENT_MANAGE,
        resource: 'department',
        action: 'manage',
        name: 'Manage Department',
        description: 'Full department management permissions',
        scope: 'organization',
      },
    ];

    return ok(
      orgPermissions,
      'Organization permissions retrieved successfully',
    );
  }
}
