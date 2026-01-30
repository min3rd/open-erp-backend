import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
   * GET /orgs/user/:userId
   * Returns organizations the user belongs to along with role(s) per org
   */
  @Get('orgs/user/:userId')
  @ApiOperation({
    summary: 'Get organizations of a user with their roles',
    description:
      'Returns organizations the user belongs to along with role(s) per org and membership metadata.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to get organizations for' })
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
    @Param('userId') userId: string,
    @Query() query: UserOrgsQueryDto,
  ) {
    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const orgs = await this.orgAdminService.getUserOrgs(userId, {
      includeRoles: query.includeRoles,
      includeOrgDetails: query.includeOrgDetails,
    });

    return ok(orgs, 'User organizations retrieved successfully');
  }

  /**
   * GET /users/:userId/roles-permissions
   * Returns effective roles and permissions for a user (global + per-org)
   */
  @Get('users/:userId/roles-permissions')
  @ApiOperation({
    summary: 'Get roles and permissions for a user',
    description:
      'Returns effective role and permission sets for user — both global and per org.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get roles/permissions for',
  })
  @ApiQuery({
    name: 'orgId',
    required: false,
    description:
      'Filter by organization ID - returns permissions scoped to that org plus global',
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
    @Param('userId') userId: string,
    @Query() query: UserRolesPermissionsQueryDto,
  ) {
    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const result = await this.orgAdminService.getUserRolesPermissions(
      userId,
      query.orgId,
    );

    return fetched(result, 'User roles and permissions retrieved successfully');
  }

  /**
   * POST /orgs/:orgId/members/:userId/grant
   * Grant roles and/or permissions to a user in an organization
   */
  @Post('orgs/:orgId/members/:userId/grant')
  @ApiOperation({
    summary: 'Grant roles/permissions to a user in an org',
    description:
      'Grant role(s) or permission(s) to a user in an organization. Requires MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS permission.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to grant roles/permissions to',
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
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() grantDto: GrantOrgRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const actorId = grantDto.actorId || req.user.userId;

    // Permission guard already checked MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS

    const membership = await this.orgAdminService.grantRolesToUserInOrg(
      orgId,
      userId,
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
}
