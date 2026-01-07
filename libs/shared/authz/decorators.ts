import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for authorization decorators
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const REQUIRED_ROLES_KEY = 'requiredRoles';
export const PERMISSION_SCOPE_KEY = 'permissionScope';
export const PERMISSION_MODE_KEY = 'permissionMode';

/**
 * Permission scope determines the context of permission checking
 * - global: Check permissions across all tenants (for system-wide operations)
 * - tenant: Check permissions within the user's tenant context (default)
 */
export type PermissionScope = 'global' | 'tenant';

/**
 * Permission check mode determines how multiple permissions are evaluated
 * - all: User must have ALL required permissions (AND logic) - default
 * - any: User must have at least ONE required permission (OR logic)
 */
export type PermissionMode = 'all' | 'any';

/**
 * Options for permission requirements
 */
export interface PermissionOptions {
  scope?: PermissionScope;
  mode?: PermissionMode;
}

/**
 * @Public decorator
 * Marks a route as public, bypassing authentication and authorization checks
 *
 * @example
 * ```typescript
 * @Controller('auth')
 * export class AuthController {
 *   @Post('login')
 *   @Public()
 *   async login(@Body() loginDto: LoginDto) {
 *     return this.authService.login(loginDto);
 *   }
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * @Permissions decorator
 * Specifies required permissions for accessing a route
 * Supports both string and array of strings, with optional scope and mode
 *
 * @param permissions - Permission(s) required (e.g., 'order.create' or ['order.create', 'order.update'])
 * @param options - Optional configuration for scope and mode
 *
 * @example
 * ```typescript
 * // Require single permission with tenant scope (default)
 * @Get('orders')
 * @Permissions('order.read')
 * async getOrders() { }
 *
 * // Require multiple permissions (all required by default)
 * @Post('orders')
 * @Permissions(['order.create', 'order.update'])
 * async createOrder() { }
 *
 * // Require any of the permissions (OR logic)
 * @Delete('orders/:id')
 * @Permissions(['order.delete', 'order.manage'], { mode: 'any' })
 * async deleteOrder() { }
 *
 * // Global scope for system-wide operations
 * @Get('admin/users')
 * @Permissions('system.admin', { scope: 'global' })
 * async getAllUsers() { }
 * ```
 */
export const Permissions = (
  permissions: string | string[],
  options?: PermissionOptions,
) => {
  const permissionArray = Array.isArray(permissions)
    ? permissions
    : [permissions];
  const scope = options?.scope || 'tenant';
  const mode = options?.mode || 'all';

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionArray)(
      target,
      key,
      descriptor,
    );
    SetMetadata(PERMISSION_SCOPE_KEY, scope)(target, key, descriptor);
    SetMetadata(PERMISSION_MODE_KEY, mode)(target, key, descriptor);
  };
};

/**
 * @Roles decorator
 * Specifies required roles for accessing a route (shortcut for common role checks)
 * Automatically determines scope based on role naming convention
 *
 * @param roles - Role code(s) required (e.g., 'SYSTEM_ADMIN' or ['TENANT_ADMIN', 'MANAGER'])
 *
 * @example
 * ```typescript
 * // Require system admin role (global scope)
 * @Get('admin/settings')
 * @Roles('SYSTEM_ADMIN')
 * async getSettings() { }
 *
 * // Require any of the specified roles
 * @Post('departments')
 * @Roles(['TENANT_ADMIN', 'MANAGER'])
 * async createDepartment() { }
 * ```
 */
export const Roles = (roles: string | string[]) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return SetMetadata(REQUIRED_ROLES_KEY, roleArray);
};
