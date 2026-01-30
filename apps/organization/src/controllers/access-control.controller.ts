import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ok } from '@shared/response';
import { getRolesByScope, RoleMetadata } from '@shared/types/role.enum';
import {
  getPermissionsByScope,
  PermissionMetadata,
  formatPermissionName,
} from '@shared/types/permission.enum';

/**
 * Access Control Controller
 * Provides access to organization-scoped roles and permissions
 */
@ApiTags('access-control')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class AccessControlController {
  private readonly logger = new Logger(AccessControlController.name);
  /**
   * GET /orgs/roles
   * Returns all available organization roles
   */
  @Get('orgs/roles')
  @ApiOperation({
    summary: 'Get all organization roles',
    description:
      'Returns a list of all available organization-specific roles (e.g., ORGANIZATION_ADMIN, MANAGER, etc.)',
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
                example: 'Organization administrator with full control over the organization',
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
    const roles = getRolesByScope('organization');

    // Map enum values using metadata with defensive checks
    const rolesData = roles
      .map((roleCode) => {
        const meta = RoleMetadata[roleCode];
        if (!meta) {
          this.logger.warn(`Missing metadata for role: ${roleCode}`);
          return null;
        }
        return {
          code: roleCode,
          name: meta.name,
          description: meta.description,
          scope: meta.scope,
        };
      })
      .filter((role): role is NonNullable<typeof role> => role !== null);

    return ok(rolesData, 'Organization roles retrieved successfully');
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
                example: 'Organization-level permission to manage users within an organization',
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
    const permissions = getPermissionsByScope('organization');

    // Map enum values using metadata with defensive checks
    const permissionsData = permissions
      .map((permissionCode) => {
        const meta = PermissionMetadata[permissionCode];
        if (!meta) {
          this.logger.warn(`Missing metadata for permission: ${permissionCode}`);
          return null;
        }
        const dotIndex = permissionCode.indexOf('.');
        const resource =
          dotIndex > -1 ? permissionCode.substring(0, dotIndex) : permissionCode;
        const action =
          dotIndex > -1 ? permissionCode.substring(dotIndex + 1) : '';
        return {
          code: permissionCode,
          resource,
          action,
          name: formatPermissionName(permissionCode),
          description: meta.description,
          scope: meta.scope,
        };
      })
      .filter(
        (permission): permission is NonNullable<typeof permission> =>
          permission !== null,
      );

    return ok(
      permissionsData,
      'Organization permissions retrieved successfully',
    );
  }
}
