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
 * Role metadata with descriptions and scope information
 */
export const RoleMetadata: Record<
  string,
  { name: string; description: string; scope: 'global' | 'organization' }
> = {
  [Role.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Full system administrator with unrestricted access',
    scope: 'global',
  },
  [Role.TENANT_ADMIN]: {
    name: 'Tenant Admin',
    description: 'Tenant administrator (legacy) - use ORGANIZATION_ADMIN',
    scope: 'organization',
  },
  [Role.ORGANIZATION_ADMIN]: {
    name: 'Organization Admin',
    description: 'Organization administrator with full control over the organization',
    scope: 'organization',
  },
  [Role.MANAGER]: {
    name: 'Manager',
    description: 'Department or team manager',
    scope: 'organization',
  },
  [Role.NAV_ADMIN]: {
    name: 'Navigation Admin',
    description: 'Navigation administrator',
    scope: 'global',
  },
  [Role.CONFIG_ADMIN]: {
    name: 'Config Admin',
    description: 'Configuration administrator',
    scope: 'global',
  },
  [Role.USER_ADMIN]: {
    name: 'User Admin',
    description: 'User management administrator',
    scope: 'global',
  },
  [Role.USER]: {
    name: 'User',
    description: 'Standard user with basic access',
    scope: 'organization',
  },
  [Role.GUEST]: {
    name: 'Guest',
    description: 'Guest user with limited access',
    scope: 'global',
  },
};

/**
 * Get roles by scope
 */
export function getRolesByScope(scope: 'global' | 'organization'): string[] {
  return Object.entries(RoleMetadata)
    .filter(([_, meta]) => meta.scope === scope)
    .map(([code]) => code);
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
