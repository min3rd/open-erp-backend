/**
 * Authorization module exports
 * Provides decorators, guards, and services for RBAC-based access control
 */

// Decorators
export {
  Public,
  Permissions,
  Roles,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
  PERMISSION_SCOPE_KEY,
  PERMISSION_MODE_KEY,
  PermissionScope,
  PermissionMode,
  PermissionOptions,
} from './decorators';

// Guard
export { PermissionsGuard, UserContext } from './permissions.guard';

// Service
export {
  AuthorizationService,
  PermissionCheckOptions,
} from './authorization.service';
