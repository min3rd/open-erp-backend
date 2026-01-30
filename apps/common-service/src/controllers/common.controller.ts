import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/authz';
import { ok } from '@shared/response';
import { getRolesByScope, RoleMetadata } from '@shared/types/role.enum';
import {
  getPermissionsByScope,
  PermissionMetadata,
  formatPermissionName,
} from '@shared/types/permission.enum';

/**
 * Common Controller
 * Provides access to system-wide (global) roles and permissions
 */
@ApiTags('common')
@ApiBearerAuth()
@Controller('common')
@UseGuards(JwtAuthGuard)
export class CommonController {
  /**
   * GET /common/roles/global
   * Returns all system-wide (global) roles
   */
  @Get('roles/global')
  @ApiOperation({
    summary: 'Get all global roles',
    description:
      'Returns a list of all system-wide roles available in the system (e.g., SUPER_ADMIN, USER, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Global roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Global roles retrieved successfully' },
        error: { type: 'null' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'SUPER_ADMIN' },
              name: { type: 'string', example: 'Super Admin' },
              description: {
                type: 'string',
                example: 'Full system administrator with unrestricted access',
              },
              scope: { type: 'string', example: 'global' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGlobalRoles() {
    const roles = getRolesByScope('global');

    // Map enum values using metadata
    const rolesData = roles.map((roleCode) => {
      const meta = RoleMetadata[roleCode];
      return {
        code: roleCode,
        name: meta.name,
        description: meta.description,
        scope: meta.scope,
      };
    });

    return ok(rolesData, 'Global roles retrieved successfully');
  }

  /**
   * GET /common/permissions/global
   * Returns all system-wide (global) permissions
   */
  @Get('permissions/global')
  @ApiOperation({
    summary: 'Get all global permissions',
    description:
      'Returns a list of all system-wide permissions available in the system (e.g., user.create, organization.read, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Global permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Global permissions retrieved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'user.create' },
              resource: { type: 'string', example: 'user' },
              action: { type: 'string', example: 'create' },
              name: { type: 'string', example: 'User Create' },
              description: {
                type: 'string',
                example: 'Permission to create new users',
              },
              scope: { type: 'string', example: 'global' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGlobalPermissions() {
    const permissions = getPermissionsByScope('global');

    // Map enum values using metadata
    const permissionsData = permissions.map((permissionCode) => {
      const meta = PermissionMetadata[permissionCode];
      const dotIndex = permissionCode.indexOf('.');
      const resource = dotIndex > -1 ? permissionCode.substring(0, dotIndex) : permissionCode;
      const action = dotIndex > -1 ? permissionCode.substring(dotIndex + 1) : '';
      return {
        code: permissionCode,
        resource,
        action,
        name: formatPermissionName(permissionCode),
        description: meta.description,
        scope: meta.scope,
      };
    });

    return ok(permissionsData, 'Global permissions retrieved successfully');
  }
}
