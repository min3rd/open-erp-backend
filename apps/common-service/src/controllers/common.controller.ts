import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/authz';
import { ok } from '@shared/response';
import { Role, getAllRoles } from '@shared/types/role.enum';
import { Permission, getAllPermissions } from '@shared/types/permission.enum';

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
                example: 'Full system administrator',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGlobalRoles() {
    const roles = getAllRoles();

    // Map enum values to more user-friendly format
    const rolesData = roles.map((roleCode) => ({
      code: roleCode,
      name: this.formatRoleName(roleCode),
      description: this.getRoleDescription(roleCode),
    }));

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
                example: 'Permission to create users',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGlobalPermissions() {
    const permissions = getAllPermissions();

    // Map enum values to more user-friendly format
    const permissionsData = permissions.map((permissionCode) => {
      const [resource, action] = permissionCode.split('.');
      return {
        code: permissionCode,
        resource,
        action,
        name: this.formatPermissionName(permissionCode),
        description: this.getPermissionDescription(permissionCode),
      };
    });

    return ok(permissionsData, 'Global permissions retrieved successfully');
  }

  /**
   * Format role code to human-readable name
   * Example: SUPER_ADMIN -> Super Admin
   */
  private formatRoleName(roleCode: string): string {
    return roleCode
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format permission code to human-readable name
   * Example: user.create -> User Create
   */
  private formatPermissionName(permissionCode: string): string {
    return permissionCode
      .split('.')
      .map((word) =>
        word
          .split('_')
          .map(
            (subword) =>
              subword.charAt(0).toUpperCase() + subword.slice(1).toLowerCase(),
          )
          .join(' '),
      )
      .join(' ');
  }

  /**
   * Get description for a role
   */
  private getRoleDescription(roleCode: string): string {
    const descriptions: Record<string, string> = {
      [Role.SUPER_ADMIN]: 'Full system administrator with unrestricted access',
      [Role.TENANT_ADMIN]:
        'Tenant administrator (legacy) - use ORGANIZATION_ADMIN',
      [Role.ORGANIZATION_ADMIN]:
        'Organization administrator with full control over the organization',
      [Role.MANAGER]: 'Department or team manager',
      [Role.NAV_ADMIN]: 'Navigation administrator',
      [Role.CONFIG_ADMIN]: 'Configuration administrator',
      [Role.USER_ADMIN]: 'User management administrator',
      [Role.USER]: 'Standard user with basic access',
      [Role.GUEST]: 'Guest user with limited access',
    };

    return descriptions[roleCode] || `${this.formatRoleName(roleCode)} role`;
  }

  /**
   * Get description for a permission
   */
  private getPermissionDescription(permissionCode: string): string {
    const descriptions: Record<string, string> = {
      // User Management
      [Permission.USER_CREATE]: 'Permission to create new users',
      [Permission.USER_READ]: 'Permission to view user information',
      [Permission.USER_UPDATE]: 'Permission to update user information',
      [Permission.USER_DELETE]: 'Permission to delete users',
      [Permission.USER_MANAGE]: 'Full user management permissions',

      // Organization Management
      [Permission.ORGANIZATION_CREATE]: 'Permission to create organizations',
      [Permission.ORGANIZATION_READ]:
        'Permission to view organization information',
      [Permission.ORGANIZATION_UPDATE]:
        'Permission to update organization information',
      [Permission.ORGANIZATION_DELETE]: 'Permission to delete organizations',
      [Permission.ORGANIZATION_MANAGE]: 'Full organization management permissions',
      [Permission.ORGANIZATION_INVITE]:
        'Permission to invite users to organization',
      [Permission.ORGANIZATION_MEMBER_UPDATE]:
        'Permission to update member roles and status',
      [Permission.ORGANIZATION_MEMBER_REMOVE]:
        'Permission to remove members from organization',
      [Permission.MANAGE_USERS_AND_ORGS]:
        'System-wide permission to manage users and organizations',
      [Permission.MANAGE_ORG_USERS]:
        'Organization-level permission to manage users within an organization',

      // Role Management
      [Permission.ROLE_CREATE]: 'Permission to create roles',
      [Permission.ROLE_READ]: 'Permission to view role information',
      [Permission.ROLE_UPDATE]: 'Permission to update roles',
      [Permission.ROLE_DELETE]: 'Permission to delete roles',
      [Permission.ROLE_MANAGE]: 'Full role management permissions',
      [Permission.ROLE_ASSIGN]: 'Permission to assign roles to users',

      // System Administration
      [Permission.SYSTEM_ADMIN]: 'Full system access',
      [Permission.SYSTEM_CONFIG]: 'System configuration access',
      [Permission.SYSTEM_LOGS]: 'View system logs',

      // Navigation Management
      [Permission.NAVIGATION_READ]: 'Permission to view navigation items',
      [Permission.NAVIGATION_CREATE]: 'Permission to create navigation items',
      [Permission.NAVIGATION_UPDATE]: 'Permission to update navigation items',
      [Permission.NAVIGATION_DELETE]: 'Permission to delete navigation items',
      [Permission.NAVIGATION_MANAGE]: 'Full navigation management permissions',

      // Configuration Management
      [Permission.CONFIG_READ]: 'Permission to view configuration',
      [Permission.CONFIG_CREATE]: 'Permission to create configuration',
      [Permission.CONFIG_UPDATE]: 'Permission to update configuration',
      [Permission.CONFIG_DELETE]: 'Permission to delete configuration',
      [Permission.CONFIG_MANAGE]: 'Full configuration management permissions',
    };

    return (
      descriptions[permissionCode] ||
      `Permission for ${this.formatPermissionName(permissionCode)}`
    );
  }
}
