# Multi-Organization & RBAC System Documentation

## Overview

This system implements a comprehensive multi-organization architecture with Role-Based Access Control (RBAC) for the Open ERP backend. Users can belong to a tenant, and permissions are managed through roles that can be either global (system-wide) or organization-scoped.

## Core Concepts

### 1. Multi-Tenancy

- **Tenant**: Represents an organization or company using the system
- Users can optionally belong to a tenant via the `organizationId` field
- Users without a tenant can either:
  1. Create their own organization
  2. Be invited to join an existing tenant by another user
- Data isolation is enforced at the query level through `organizationId` filtering
- Tenants can be in different states: `active`, `inactive`, `suspended`, or `trial`

### 2. Roles

Roles are collections of permissions that can be assigned to users. Roles have two scopes:

- **Global Roles**: Apply across all tenants (e.g., System Administrator, Support Staff)
- **Tenant Roles**: Only apply within a specific tenant (e.g., Tenant Admin, Manager, Employee)

### 3. Permissions

Permissions follow a `resource.action` naming convention:
- Examples: `user.create`, `order.read`, `tenant.manage`
- Centralized in the `Permission` enum for type safety
- Permissions are stored as string arrays on roles

### 4. Permission Resolution

User permissions are calculated by:
1. **Special Permissions**: Directly assigned to the user (highest priority)
2. **Role Permissions**: Aggregated from all assigned roles
   - Global roles apply to all tenants
   - Tenant roles only apply if they match the user's tenant

### 5. Role Assignments

Users can have multiple role assignments, each with:
- `roleId`: The role being assigned
- `departmentId` (optional): Limits the role to a specific department
- `grantedAt`: Timestamp of when the role was granted
- `grantedBy` (optional): User who granted the role

## Schema Design

### Tenant Schema

```typescript
{
  name: string;              // Display name
  slug: string;              // Unique URL-friendly identifier
  description?: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  settings: Map<string, string>;
  deletedAt?: Date;
  trialExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Role Schema

```typescript
{
  name: string;              // Display name
  code: string;              // Unique code (e.g., SYSTEM_ADMIN)
  description?: string;
  scope: 'global' | 'tenant';
  organizationId?: ObjectId;       // Required for organization-scoped roles
  permissions: string[];     // Array of permission strings
  status: 'active' | 'inactive';
  isSystem: boolean;         // System roles cannot be deleted
  metadata: Map<string, string>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Department Schema

```typescript
{
  organizationId: ObjectId;        // Parent tenant
  name: string;
  code: string;              // Unique within tenant
  description?: string;
  parentId?: ObjectId;       // For department hierarchy
  managerId?: ObjectId;      // Department manager
  status: 'active' | 'inactive';
  metadata: Map<string, string>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### User Schema (Updated)

```typescript
{
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  password?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  
  // Multi-tenant & RBAC fields
  organizationId?: ObjectId;                   // Optional: user's tenant (null until they create/join one)
  roleAssignments: RoleAssignment[];     // Array of role assignments
  specialPermissions: string[];          // Direct permissions
  
  verifiedAt?: Date;
  deletedAt?: Date;
  lastLoginAt?: Date;
  metadata: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

interface RoleAssignment {
  roleId: ObjectId;
  departmentId?: ObjectId;
  grantedAt: Date;
  grantedBy?: ObjectId;
}
```

## Usage Examples

### 1. Checking Permissions

```typescript
import { PermissionService } from '@shared/services';
import { Permission } from '@shared/types';

// Inject the service
constructor(private permissionService: PermissionService) {}

// Check single permission
const canCreateUser = await this.permissionService.hasPermission(
  userId,
  Permission.USER_CREATE
);

// Check multiple permissions (OR logic)
const canManageUsers = await this.permissionService.hasAnyPermission(
  userId,
  [Permission.USER_CREATE, Permission.USER_UPDATE, Permission.USER_DELETE]
);

// Check multiple permissions (AND logic)
const canFullyManageOrders = await this.permissionService.hasAllPermissions(
  userId,
  [Permission.ORDER_CREATE, Permission.ORDER_UPDATE, Permission.ORDER_APPROVE]
);
```

### 2. Getting Effective Permissions

```typescript
// Get all permissions for a user
const permissions = await this.permissionService.getEffectivePermissions(userId);
console.log('User permissions:', permissions);
// Output: ['user.create', 'user.read', 'order.read', ...]
```

### 3. Creating a Tenant

```typescript
import { Tenant } from '@shared/schemas';

const tenant = await tenantModel.create({
  name: 'Acme Corporation',
  slug: 'acme-corp',
  description: 'Acme Corp tenant',
  status: 'active',
  settings: {},
});
```

### 4. Creating Roles

```typescript
import { Role } from '@shared/schemas';
import { Permission } from '@shared/types';

// Global role
const systemAdmin = await roleModel.create({
  name: 'System Administrator',
  code: 'SYSTEM_ADMIN',
  scope: 'global',
  organizationId: null,
  permissions: [
    Permission.SYSTEM_ADMIN,
    Permission.TENANT_MANAGE,
    Permission.USER_MANAGE,
  ],
  status: 'active',
  isSystem: true,
});

// Tenant role
const tenantManager = await roleModel.create({
  name: 'Manager',
  code: 'MANAGER',
  scope: 'tenant',
  organizationId: organizationId,
  permissions: [
    Permission.USER_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_APPROVE,
  ],
  status: 'active',
  isSystem: false,
});
```

### 5. Assigning Roles to Users

```typescript
// Assign a single role
user.roleAssignments.push({
  roleId: managerRole._id,
  departmentId: salesDepartment._id,
  grantedAt: new Date(),
  grantedBy: adminUser._id,
});
await user.save();

// Assign multiple roles
user.roleAssignments = [
  {
    roleId: employeeRole._id,
    grantedAt: new Date(),
  },
  {
    roleId: managerRole._id,
    departmentId: salesDepartment._id,
    grantedAt: new Date(),
  },
];
await user.save();
```

### 6. Granting Special Permissions

```typescript
// Grant specific permission directly to user
user.specialPermissions.push(Permission.REPORT_EXPORT);
await user.save();

// Remove special permission
user.specialPermissions = user.specialPermissions.filter(
  p => p !== Permission.REPORT_EXPORT
);
await user.save();
```

### 7. Creating Departments

```typescript
import { Department } from '@shared/schemas';

const salesDept = await departmentModel.create({
  organizationId: tenant._id,
  name: 'Sales',
  code: 'sales',
  description: 'Sales department',
  managerId: managerUser._id,
  status: 'active',
});

// Create sub-department
const enterpriseSales = await departmentModel.create({
  organizationId: tenant._id,
  name: 'Enterprise Sales',
  code: 'enterprise-sales',
  parentId: salesDept._id,
  status: 'active',
});
```

## Default Roles

### Global Roles

#### System Administrator (`SYSTEM_ADMIN`)
- Full system access across all tenants
- Can manage tenants, users, roles, and all resources
- Cannot be deleted (system role)

#### Support Staff (`SUPPORT_STAFF`)
- Read-only access across tenants
- Can view users, orders, products for support purposes
- Cannot be deleted (system role)

### Tenant Roles

#### Tenant Admin (`TENANT_ADMIN`)
- Full administrative access within their tenant
- Can manage users, roles, departments, orders, products
- Can be customized per tenant

#### Manager (`MANAGER`)
- Department-level management
- Can approve orders, manage team resources
- Read/write access to relevant resources

#### Sales Representative (`SALES_REP`)
- Sales-focused permissions
- Can create and manage orders
- Read-only access to products

#### Employee (`EMPLOYEE`)
- Basic read-only access
- Can view users, departments, products, reports
- Minimal permissions for standard employees

## Migration Guide

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:down
```

### Seeding Default Roles

```bash
# Seed default global and tenant roles
node scripts/seed-roles.js
```

### Migration Order

1. **20251230080000**: Creates tenants collection
2. **20251230080100**: Creates roles collection
3. **20251230080200**: Creates departments collection
4. **20251230080300**: Adds multi-organization and RBAC fields to users
   - Makes `organizationId` optional (users without tenant can create one or be invited)
   - Initializes empty `roleAssignments` and `specialPermissions` for existing users

## Querying with Tenant Isolation

### Automatic Filtering

The schemas include middleware that automatically filters by `organizationId`. For user queries:

```typescript
// This automatically filters by non-deleted users
const users = await userModel.find({ organizationId: currentTenantId });

// To include deleted users
const allUsers = await userModel
  .find({ organizationId: currentTenantId })
  .setOptions({ includeDeleted: true });
```

### Repository Pattern Example

```typescript
class TenantAwareRepository {
  constructor(
    private model: Model<any>,
    private organizationId: ObjectId
  ) {}

  async find(filter: any) {
    return this.model.find({
      ...filter,
      organizationId: this.organizationId,
    });
  }

  async findById(id: string) {
    return this.model.findOne({
      _id: id,
      organizationId: this.organizationId,
    });
  }
}
```

## Best Practices

### 1. Permission Checking

- Always check permissions at the service/controller level
- Use the `PermissionService` for consistency
- Cache permission checks for frequently accessed routes

### 2. Tenant Isolation

- Always include `organizationId` in queries for organization-scoped resources
- Never trust client-provided `organizationId` - extract from authenticated session
- Use middleware or guards to enforce tenant context

### 3. Role Management

- Avoid modifying system roles (`isSystem: true`)
- Create new roles instead of modifying existing ones
- Document custom roles with clear descriptions

### 4. Special Permissions

- Use sparingly for exceptional cases
- Document why special permissions were granted
- Audit special permission grants regularly

### 5. Audit Logging

- Log all role assignments and permission grants
- Track who granted permissions via `grantedBy`
- Implement periodic permission reviews

## Security Considerations

### 1. Privilege Escalation

- Validate that only users with `ROLE_MANAGE` can assign roles
- Prevent users from granting permissions they don't have
- Restrict global role creation to system administrators

### 2. Tenant Isolation

- Never expose data from other tenants
- Validate `organizationId` matches authenticated user's tenant
- Use database-level constraints where possible

### 3. Password and Secrets

- Never log or expose user passwords
- Use `select: false` for sensitive fields
- Implement proper password hashing

### 4. Token Security

- Don't include all permissions in JWT tokens (too large)
- Include minimal claims: userId, organizationId, key roles
- Validate permissions on each request, not just from token

## Testing

Run the permission service tests:

```bash
npm test -- permission.service.spec.ts
```

The test suite covers:
- Permission checking logic
- Special permissions override
- Role aggregation
- Tenant isolation for roles
- Global vs organization-scoped roles
- Multiple role assignments
- Department-scoped roles

## API Integration Examples

### Guard/Decorator for Permission Checking

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '@shared/services';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return this.permissionService.hasAllPermissions(
      user.id,
      requiredPermissions,
    );
  }
}

// Decorator
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Usage in controller
@Controller('users')
export class UsersController {
  @Get()
  @RequirePermissions(Permission.USER_READ)
  async findAll() {
    // ...
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  async create(@Body() createUserDto: CreateUserDto) {
    // ...
  }
}
```

## Troubleshooting

### User cannot access resource despite having role

1. Check role is active: `role.status === 'active'`
2. Verify role scope matches user's tenant (for organization-scoped roles)
3. Ensure permission is in role's `permissions` array
4. Check user's `roleAssignments` includes the role

### Permission denied for global admin

1. Verify role has `scope: 'global'`
2. Check role does not have `organizationId` set
3. Ensure permission is in the role's permissions list

### Migration fails

1. Ensure MongoDB is running and accessible
2. Check migration order - run in sequence
3. Verify no duplicate slugs/codes exist
4. Check database user has necessary permissions

## Future Enhancements

Potential additions to the system:

1. **Permission Hierarchy**: Support for parent-child permission relationships
2. **Time-based Permissions**: Permissions valid only during certain time periods
3. **Conditional Permissions**: Permissions based on resource attributes
4. **Permission Delegation**: Users temporarily delegating permissions
5. **Audit Trail UI**: Dashboard for viewing permission changes
6. **Role Templates**: Pre-built role configurations for common scenarios
7. **API Rate Limiting**: Per-role or per-tenant rate limits
8. **Resource-level Permissions**: Fine-grained permissions on specific resources
