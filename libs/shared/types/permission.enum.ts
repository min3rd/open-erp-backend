/**
 * Permission Registry
 * Centralized list of all permissions in the system
 * Format: resource.action
 */
export enum Permission {
  // User Management
  USER_CREATE = 'user.create',
  USER_READ = 'user.read',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_MANAGE = 'user.manage', // Full user management

  // Tenant Management (Legacy - for backward compatibility with old data)
  // Use ORGANIZATION_* permissions for new code
  TENANT_CREATE = 'tenant.create',
  TENANT_READ = 'tenant.read',
  TENANT_UPDATE = 'tenant.update',
  TENANT_DELETE = 'tenant.delete',
  TENANT_MANAGE = 'tenant.manage', // Full tenant management

  // Organization Management (Preferred)
  ORGANIZATION_CREATE = 'organization.create',
  ORGANIZATION_READ = 'organization.read',
  ORGANIZATION_UPDATE = 'organization.update',
  ORGANIZATION_DELETE = 'organization.delete',
  ORGANIZATION_MANAGE = 'organization.manage', // Full organization management
  ORGANIZATION_INVITE = 'organization.invite', // Invite users to organization
  ORGANIZATION_MEMBER_UPDATE = 'organization.member.update', // Update member roles/status
  ORGANIZATION_MEMBER_REMOVE = 'organization.member.remove', // Remove members from organization

  // Role Management
  ROLE_CREATE = 'role.create',
  ROLE_READ = 'role.read',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  ROLE_MANAGE = 'role.manage', // Full role management
  ROLE_ASSIGN = 'role.assign', // Assign roles to users

  // Department Management
  DEPARTMENT_CREATE = 'department.create',
  DEPARTMENT_READ = 'department.read',
  DEPARTMENT_UPDATE = 'department.update',
  DEPARTMENT_DELETE = 'department.delete',
  DEPARTMENT_MANAGE = 'department.manage',

  // System Administration
  SYSTEM_ADMIN = 'system.admin', // Full system access
  SYSTEM_CONFIG = 'system.config', // System configuration
  SYSTEM_LOGS = 'system.logs', // View system logs

  // Order Management (example for ERP)
  ORDER_CREATE = 'order.create',
  ORDER_READ = 'order.read',
  ORDER_UPDATE = 'order.update',
  ORDER_DELETE = 'order.delete',
  ORDER_APPROVE = 'order.approve',
  ORDER_MANAGE = 'order.manage',

  // Product Management (example for ERP)
  PRODUCT_CREATE = 'product.create',
  PRODUCT_READ = 'product.read',
  PRODUCT_UPDATE = 'product.update',
  PRODUCT_DELETE = 'product.delete',
  PRODUCT_MANAGE = 'product.manage',

  // Report Access
  REPORT_VIEW = 'report.view',
  REPORT_EXPORT = 'report.export',
  REPORT_MANAGE = 'report.manage',

  // Navigation Management
  NAVIGATION_READ = 'navigation.read',
  NAVIGATION_CREATE = 'navigation.create',
  NAVIGATION_UPDATE = 'navigation.update',
  NAVIGATION_DELETE = 'navigation.delete',
  NAVIGATION_MANAGE = 'navigation.manage', // Full navigation management

  // Configuration Management
  CONFIG_READ = 'config.read',
  CONFIG_CREATE = 'config.create',
  CONFIG_UPDATE = 'config.update',
  CONFIG_DELETE = 'config.delete',
  CONFIG_MANAGE = 'config.manage',
}

/**
 * Helper function to get all permissions as strings
 */
export function getAllPermissions(): string[] {
  return Object.values(Permission);
}

/**
 * Helper function to validate if a permission exists
 */
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}

/**
 * Permission groups for easier role creation
 */
export const PermissionGroups = {
  USER_FULL: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
  ],
  // Legacy - kept for backward compatibility with existing data
  TENANT_FULL: [
    Permission.TENANT_CREATE,
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_DELETE,
  ],
  // Preferred for new code
  ORGANIZATION_FULL: [
    Permission.ORGANIZATION_CREATE,
    Permission.ORGANIZATION_READ,
    Permission.ORGANIZATION_UPDATE,
    Permission.ORGANIZATION_DELETE,
    Permission.ORGANIZATION_INVITE,
    Permission.ORGANIZATION_MEMBER_UPDATE,
    Permission.ORGANIZATION_MEMBER_REMOVE,
  ],
  ROLE_FULL: [
    Permission.ROLE_CREATE,
    Permission.ROLE_READ,
    Permission.ROLE_UPDATE,
    Permission.ROLE_DELETE,
    Permission.ROLE_ASSIGN,
  ],
  DEPARTMENT_FULL: [
    Permission.DEPARTMENT_CREATE,
    Permission.DEPARTMENT_READ,
    Permission.DEPARTMENT_UPDATE,
    Permission.DEPARTMENT_DELETE,
  ],
  ORDER_FULL: [
    Permission.ORDER_CREATE,
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_DELETE,
    Permission.ORDER_APPROVE,
  ],
  PRODUCT_FULL: [
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
  ],
  REPORT_FULL: [
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_MANAGE,
  ],
  NAVIGATION_FULL: [
    Permission.NAVIGATION_CREATE,
    Permission.NAVIGATION_READ,
    Permission.NAVIGATION_UPDATE,
    Permission.NAVIGATION_DELETE,
  ],
  CONFIG_FULL: [
    Permission.CONFIG_CREATE,
    Permission.CONFIG_READ,
    Permission.CONFIG_UPDATE,
    Permission.CONFIG_DELETE,
  ],
};
