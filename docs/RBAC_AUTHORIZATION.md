# RBAC Authorization System

Complete Role-Based Access Control (RBAC) system with decorators, guards, and services for the Open ERP backend.

## Features

- **Decorators**: `@Public()`, `@Permissions()`, `@Roles()` for declarative authorization
- **Scope Support**: Global and organization-scoped permission checking
- **Guard**: `PermissionsGuard` for automatic route protection
- **Service**: `AuthorizationService` with helper methods for programmatic checks
- **Cross-organization Access**: System admins can access resources across tenants
- **Structured Logging**: All authorization decisions are logged with correlation IDs
- **Metrics**: Track allow/deny/missing_permissions counters
- **Type-safe**: Full TypeScript support with interfaces and types

## Quick Start

### 1. Module Setup

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard, AuthorizationService } from '@shared/authz';
import { User, UserSchema } from '@shared/schemas/user.schema';
import { Role, RoleSchema } from '@shared/schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [
    AuthorizationService,
    {
      // Apply guard globally to all routes
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AuthorizationService],
})
export class AuthModule {}
```

### 2. Controller Usage

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public, Permissions, Roles } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('orders')
@UseGuards(PermissionsGuard) // If not applied globally
export class OrdersController {
  // Public route - no authentication required
  @Get('catalog')
  @Public()
  async getPublicCatalog() {
    return { message: 'Public catalog' };
  }

  // Tenant-scoped permission (default)
  @Get()
  @Permissions(Permission.ORDER_READ)
  async getOrders() {
    return { message: 'Orders for current tenant' };
  }

  // Multiple permissions required (all by default)
  @Post()
  @Permissions([Permission.ORDER_CREATE, Permission.ORDER_UPDATE])
  async createOrder() {
    return { message: 'Order created' };
  }

  // Any of the permissions (OR logic)
  @Delete(':id')
  @Permissions([Permission.ORDER_DELETE, Permission.ORDER_MANAGE], {
    mode: 'any',
  })
  async deleteOrder() {
    return { message: 'Order deleted' };
  }

  // Global scope permission
  @Get('all')
  @Permissions(Permission.SYSTEM_ADMIN, { scope: 'global' })
  async getAllOrders() {
    return { message: 'All orders across all tenants' };
  }

  // Role-based check
  @Get('reports')
  @Roles(['TENANT_ADMIN', 'MANAGER'])
  async getReports() {
    return { message: 'Reports' };
  }
}
```

### 3. Service Usage

```typescript
import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '@shared/authz';
import { Permission } from '@shared/types';

@Injectable()
export class OrderService {
  constructor(private authorizationService: AuthorizationService) {}

  async processOrder(userId: string, orderId: string) {
    // Check permission programmatically
    const hasPermission = await this.authorizationService.hasPermission(
      userId,
      Permission.ORDER_UPDATE,
      { scope: 'tenant' },
    );

    if (!hasPermission) {
      throw new ForbiddenException('Cannot update order');
    }

    // Check if user is admin
    const isAdmin = await this.authorizationService.isTenantAdmin(userId);

    // Get all effective permissions
    const permissions = await this.authorizationService.getEffectivePermissions(
      userId,
      'tenant',
    );

    // Process order...
  }
}
```

## Decorators

### @Public()

Marks a route as public, bypassing all authentication and authorization checks.

```typescript
@Get('health')
@Public()
async healthCheck() {
  return { status: 'ok' };
}
```

### @Permissions(permissions, options?)

Specifies required permissions for a route.

**Parameters:**
- `permissions`: String or array of permission strings
- `options`: Optional configuration
  - `scope`: 'global' | 'tenant' (default: 'tenant')
  - `mode`: 'all' | 'any' (default: 'all')

**Examples:**

```typescript
// Single permission, organization scope (default)
@Permissions('order.create')

// Multiple permissions, all required (default)
@Permissions(['order.create', 'order.update'])

// Multiple permissions, any required (OR logic)
@Permissions(['order.delete', 'order.manage'], { mode: 'any' })

// Global scope
@Permissions('system.admin', { scope: 'global' })

// Global scope with any mode
@Permissions(['system.admin', 'system.config'], {
  scope: 'global',
  mode: 'any',
})
```

### @Roles(roles)

Specifies required roles for a route (shortcut for role-based checks).

**Parameters:**
- `roles`: String or array of role codes

**Examples:**

```typescript
// Single role
@Roles('SYSTEM_ADMIN')

// Multiple roles (any required)
@Roles(['TENANT_ADMIN', 'MANAGER'])
```

## Authorization Service

### Methods

#### `hasPermission(userId, permission, options?)`

Check if a user has a specific permission.

```typescript
const hasPermission = await authorizationService.hasPermission(
  'user123',
  'order.create',
  { scope: 'tenant', organizationId: 'tenant123' },
);
```

#### `hasAnyPermission(userId, permissions, options?)`

Check if a user has at least one of the specified permissions (OR logic).

```typescript
const hasPermission = await authorizationService.hasAnyPermission(
  'user123',
  ['order.delete', 'order.manage'],
  { scope: 'tenant' },
);
```

#### `hasAllPermissions(userId, permissions, options?)`

Check if a user has all of the specified permissions (AND logic).

```typescript
const hasPermission = await authorizationService.hasAllPermissions(
  'user123',
  ['order.create', 'order.update'],
  { scope: 'tenant' },
);
```

#### `getEffectivePermissions(user, scope?, organizationId?)`

Get all effective permissions for a user.

```typescript
const permissions = await authorizationService.getEffectivePermissions(
  userDoc,
  'tenant',
  'tenant123',
);
// Returns: ['order.create', 'order.read', 'order.update', ...]
```

#### `hasRole(userId, roleCode)`

Check if a user has a specific role.

```typescript
const hasRole = await authorizationService.hasRole('user123', 'TENANT_ADMIN');
```

#### `hasAnyRole(userId, roleCodes)`

Check if a user has any of the specified roles.

```typescript
const hasRole = await authorizationService.hasAnyRole('user123', [
  'TENANT_ADMIN',
  'MANAGER',
]);
```

#### `isSystemAdmin(userId)`

Check if a user is a system admin (has SYSTEM_ADMIN role).

```typescript
const isAdmin = await authorizationService.isSystemAdmin('user123');
```

#### `isTenantAdmin(userId, organizationId?)`

Check if a user is a organization admin for a specific tenant.

```typescript
const isAdmin = await authorizationService.isTenantAdmin(
  'user123',
  'tenant123',
);
```

#### `getUserRolesWithDetails(userId)`

Get all roles assigned to a user with their details.

```typescript
const roles = await authorizationService.getUserRolesWithDetails('user123');
// Returns array of: { role, departmentId?, grantedAt, grantedBy? }
```

## Scope Behavior

### Tenant Scope (default)

- Checks permissions within the user's tenant context
- Only considers:
  - User's special permissions
  - Global roles (apply across all tenants)
  - Tenant roles matching the user's organizationId

**Use for:** Most application features (orders, products, departments, etc.)

### Global Scope

- Checks permissions globally (system-wide operations)
- Only considers:
  - User's special permissions
  - Global roles only (tenant roles are excluded)

**Use for:** System administration, cross-organization operations, global settings

## Mode Behavior

### 'all' Mode (default)

User must have **ALL** listed permissions (AND logic).

```typescript
@Permissions(['order.create', 'order.update']) // Requires both
```

### 'any' Mode

User must have **at least ONE** listed permission (OR logic).

```typescript
@Permissions(['order.delete', 'order.manage'], { mode: 'any' }) // Requires either
```

## Organization ID Resolution

The guard resolves `organizationId` from multiple sources in priority order:

1. **JWT claim** (most trusted): `user.organizationId`
2. **Route parameter**: `request.params.organizationId`
3. **Request header**: `request.headers['x-organization-id']`

### Cross-organization Access

- Regular users can only access resources in their own organization
- System admins (SYSTEM_ADMIN role) can access resources across all tenants
- Cross-organization access attempts by non-admins are denied with `AUTH_FORBIDDEN_CROSS_TENANT` error

## Error Codes

| Error Code | Description |
|------------|-------------|
| `AUTH_UNAUTHORIZED` (AUTH_0005) | User not authenticated |
| `AUTH_INSUFFICIENT_PERMISSIONS` (AUTH_0010) | User lacks required permissions |
| `AUTH_FORBIDDEN_CROSS_TENANT` (AUTH_0011) | Cross-organization access denied |

## Logging

All authorization deny decisions are logged with structured format:

```json
{
  "message": "Authorization denied",
  "correlationId": "uuid-v4",
  "userId": "user123",
  "route": "GET /orders",
  "reason": "User lacks required permissions",
  "requiredPermissions": ["order.create"],
  "scope": "tenant",
  "mode": "all",
  "organizationId": "tenant123"
}
```

## Metrics

The guard tracks authorization decisions:

- `authz.allow`: Number of successful authorization checks
- `authz.deny`: Number of denied authorization checks
- `authz.missing_permissions`: Number of permission-based denials

Access metrics via:

```typescript
const metrics = PermissionsGuard.getMetrics();
console.log(metrics);
// { 'authz.allow': 150, 'authz.deny': 5, 'authz.missing_permissions': 3 }
```

## User Context

The guard expects user information in the request object (set by authentication middleware):

```typescript
interface UserContext {
  userId: string;
  organizationId?: string;
  roles?: string[]; // Optional snapshot
  [key: string]: any;
}
```

## Examples

See complete examples in:
- `/docs/examples/rbac-decorators.example.ts` - Controller examples
- `/docs/examples/permission-guards.example.ts` - Original PermissionService examples

## Testing

### Unit Tests

- **Decorators**: 12 tests covering metadata setting
- **Guard**: 16 tests covering authorization logic
- **Service**: 20 tests covering permission resolution (requires MongoDB)

Run tests:

```bash
npm test -- libs/shared/authz
```

### Integration Tests

See `/libs/shared/authz/*.spec.ts` for test examples.

## Best Practices

1. **Use organization scope by default** for application features
2. **Use global scope sparingly** for system-wide operations only
3. **Prefer @Permissions over @Roles** for flexibility
4. **Always use @Public()** to mark public routes explicitly
5. **Don't store all permissions in JWT** - check on each request
6. **Never trust client-provided organizationId** - use JWT claim
7. **Regular audit** special permissions (they override roles)
8. **Apply guard globally** via APP_GUARD for consistency

## Migration from Old System

If you're using the old PermissionService:

1. Import from `@shared/authz` instead of `@shared/services`
2. Use `AuthorizationService` instead of `PermissionService`
3. Add scope parameter to permission checks
4. Replace custom guards with `PermissionsGuard`
5. Update decorators to use new `@Permissions()` syntax

## Troubleshooting

### Issue: "User not authenticated"

**Cause**: JWT authentication guard not running before PermissionsGuard

**Solution**: Ensure JWT guard runs first (order matters in module providers)

### Issue: "Tenant context required"

**Cause**: Missing organizationId for organization-scoped permission check

**Solution**: Ensure JWT includes organizationId or provide via header/param

### Issue: "Cross-organization access denied"

**Cause**: User trying to access resources in another tenant

**Solution**: Grant SYSTEM_ADMIN role for cross-organization access, or ensure organizationId consistency

### Issue: Tests failing with MongoDB errors

**Cause**: AuthorizationService tests require MongoDB connection

**Solution**: Ensure MongoDB is running or use in-memory MongoDB for tests

## Related Documentation

- [Multi-tenant RBAC](./MULTI_TENANT_RBAC.md) - Complete RBAC system documentation
- [Permission Enum](../libs/shared/types/permission.enum.ts) - All available permissions
- [User Schema](../libs/shared/schemas/user.schema.ts) - User data model
- [Role Schema](../libs/shared/schemas/role.schema.ts) - Role data model

## Support

For questions or issues:
1. Check this README and related documentation
2. Review test cases in `libs/shared/authz/*.spec.ts`
3. Consult examples in `docs/examples/`
4. Check error logs for correlation IDs and detailed error messages
