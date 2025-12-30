# Multi-Tenant & RBAC Implementation

This directory contains a complete implementation of a multi-tenant architecture with Role-Based Access Control (RBAC) for the Open ERP backend.

## 📁 What's Included

### Schemas (`libs/shared/schemas/`)
- **tenant.schema.ts** - Tenant/organization management
- **role.schema.ts** - Roles with global/tenant scoping
- **department.schema.ts** - Department hierarchy within tenants
- **user.schema.ts** - Updated with multi-tenant and RBAC fields

### Services (`libs/shared/services/`)
- **permission.service.ts** - Core permission resolution logic (legacy)
- **permission.service.spec.ts** - Comprehensive test suite

### Authorization (`libs/shared/authz/`)
- **decorators.ts** - @Public(), @Permissions(), @Roles() decorators
- **permissions.guard.ts** - NestJS guard for route protection
- **authorization.service.ts** - Enhanced permission checking with scope support
- **Tests** - Comprehensive unit tests for all components

### Types (`libs/shared/types/`)
- **permission.enum.ts** - Centralized permission definitions

### Migrations (`migrations/`)
- **20251230080000-create-tenants-collection.js** - Creates tenants collection
- **20251230080100-create-roles-collection.js** - Creates roles collection
- **20251230080200-create-departments-collection.js** - Creates departments collection
- **20251230080300-add-multitenant-rbac-to-users.js** - Updates users with tenant and RBAC fields

### Scripts (`scripts/`)
- **seed-roles.js** - Seeds default global and tenant roles

### Documentation (`docs/`)
- **MULTI_TENANT_RBAC.md** - Complete usage guide and reference
- **RBAC_AUTHORIZATION.md** - Authorization middleware, decorators, and guards
- **examples/permission-guards.example.ts** - NestJS guard examples (legacy)
- **examples/rbac-decorators.example.ts** - Complete controller examples with new decorators
- **examples/rbac-integration-tests.example.ts** - Integration test patterns

## 🚀 Quick Start

### 1. Run Migrations

```bash
# Run all migrations
npm run db:migrate

# Check status
npm run db:migrate:status
```

### 2. Seed Default Roles

```bash
node scripts/seed-roles.js
```

### 3. Use in Your Code

**Option A: Using Decorators (Recommended)**

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public, Permissions, Roles, PermissionsGuard } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrdersController {
  @Get()
  @Permissions(Permission.ORDER_READ)
  async getOrders() {
    // Only users with order.read permission can access
  }

  @Post()
  @Permissions([Permission.ORDER_CREATE, Permission.ORDER_UPDATE])
  async createOrder() {
    // Users need both permissions
  }

  @Get('catalog')
  @Public()
  async getPublicCatalog() {
    // No authentication required
  }
}
```

**Option B: Using Service Programmatically**

```typescript
import { AuthorizationService } from '@shared/authz';
import { Permission } from '@shared/types';

// Inject the service
constructor(private authorizationService: AuthorizationService) {}

// Check permission
const canCreate = await this.authorizationService.hasPermission(
  userId,
  Permission.ORDER_CREATE,
  { scope: 'tenant' }
);
```

## 📖 Key Concepts

### Multi-Tenancy
- Users can optionally belong to a tenant
- Users without a tenant can create their own or be invited to join one
- Data is isolated by `tenantId`
- Automatic filtering at the query level

### Roles
- **Global Roles**: Apply across all tenants (e.g., System Admin)
- **Tenant Roles**: Only apply within a specific tenant (e.g., Manager)

### Permissions
- Follow `resource.action` format (e.g., `user.create`, `order.approve`)
- Centralized in Permission enum
- Permissions are aggregated from:
  1. Special permissions (directly assigned to user)
  2. Global roles (apply everywhere)
  3. Tenant roles (apply only in user's tenant)

### Role Assignments
- Users can have multiple roles
- Roles can be scoped to specific departments
- Tracks who granted the role and when

## 📚 Further Reading

- **[MULTI_TENANT_RBAC.md](./MULTI_TENANT_RBAC.md)** - Complete schema documentation and permission resolution
- **[RBAC_AUTHORIZATION.md](./RBAC_AUTHORIZATION.md)** - Decorators, guards, and authorization service guide

Topics covered:
- Complete schema documentation
- Usage examples for decorators and services
- Scope behavior (global vs tenant)
- Security best practices
- Troubleshooting guide
- API integration patterns
- Testing strategies

## 🧪 Testing

Run the permission service tests:

```bash
npm test -- permission.service.spec.ts
```

## 🔒 Security Notes

1. **Never trust client-provided tenantId** - Always extract from authenticated session
2. **Use middleware/guards** for permission checking
3. **Don't include all permissions in JWT** - They're too large, check on each request
4. **Audit permission changes** - Log all role assignments and grants
5. **Follow least privilege** - Start with minimal permissions

## 📦 Default Roles

### Global Roles
- **SYSTEM_ADMIN** - Full system access
- **SUPPORT_STAFF** - Read-only access for customer support

### Tenant Roles (per tenant)
- **TENANT_ADMIN** - Full tenant administration
- **MANAGER** - Department-level management
- **SALES_REP** - Sales-specific permissions
- **EMPLOYEE** - Basic read-only access

## 🛠️ Integration Example

**Full module setup with new authorization:**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';
import { AuthorizationService, PermissionsGuard } from '@shared/authz';

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

## 🤝 Contributing

When adding new permissions:
1. Add to `Permission` enum in `libs/shared/types/permission.enum.ts`
2. Update documentation in `docs/MULTI_TENANT_RBAC.md`
3. Consider adding to default roles in `scripts/seed-roles.js`

## 📝 License

See repository license.
