# Multi-Tenant & RBAC Implementation

This directory contains a complete implementation of a multi-tenant architecture with Role-Based Access Control (RBAC) for the Open ERP backend.

## 📁 What's Included

### Schemas (`libs/shared/schemas/`)
- **tenant.schema.ts** - Tenant/organization management
- **role.schema.ts** - Roles with global/tenant scoping
- **department.schema.ts** - Department hierarchy within tenants
- **user.schema.ts** - Updated with multi-tenant and RBAC fields

### Services (`libs/shared/services/`)
- **permission.service.ts** - Core permission resolution logic
- **permission.service.spec.ts** - Comprehensive test suite

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
- **examples/permission-guards.example.ts** - NestJS guard and decorator examples

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

```typescript
import { PermissionService } from '@shared/services';
import { Permission } from '@shared/types';

// Inject the service
constructor(private permissionService: PermissionService) {}

// Check permission
const canCreate = await this.permissionService.hasPermission(
  userId,
  Permission.USER_CREATE
);
```

## 📖 Key Concepts

### Multi-Tenancy
- Each user belongs to exactly one tenant
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

See [MULTI_TENANT_RBAC.md](./MULTI_TENANT_RBAC.md) for:
- Complete schema documentation
- Usage examples
- Security best practices
- Troubleshooting guide
- API integration patterns

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

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';
import { PermissionService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [PermissionService],
  exports: [PermissionService],
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
