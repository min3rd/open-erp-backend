/**
 * Role Registry
 * Centralized list of all roles in the system
 */
export enum Role {
  // System-level roles
  SUPER_ADMIN = 'SUPER_ADMIN', // Full system administrator

  // Tenant/Organization-level roles
  TENANT_ADMIN = 'TENANT_ADMIN', // Tenant administrator (legacy)
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN', // Organization administrator (preferred)

  // Management roles
  MANAGER = 'MANAGER', // Department or team manager

  // Specialized admin roles
  NAV_ADMIN = 'NAV_ADMIN', // Navigation administrator
  CONFIG_ADMIN = 'CONFIG_ADMIN', // Configuration administrator
  USER_ADMIN = 'USER_ADMIN', // User management administrator

  // Standard user roles
  USER = 'USER', // Standard user
  GUEST = 'GUEST', // Guest user with limited access
}

/**
 * Helper function to get all roles as strings
 */
export function getAllRoles(): string[] {
  return Object.values(Role);
}

/**
 * Helper function to validate if a role exists
 */
export function isValidRole(role: string): boolean {
  return getAllRoles().includes(role);
}

/**
 * Role groups for easier permission assignment
 */
export const RoleGroups = {
  ADMIN_ROLES: [Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.ORGANIZATION_ADMIN],
  NAVIGATION_ADMINS: [Role.SUPER_ADMIN, Role.NAV_ADMIN],
  CONFIG_ADMINS: [Role.SUPER_ADMIN, Role.CONFIG_ADMIN],
  USER_ADMINS: [
    Role.SUPER_ADMIN,
    Role.USER_ADMIN,
    Role.TENANT_ADMIN,
    Role.ORGANIZATION_ADMIN,
  ],
};
