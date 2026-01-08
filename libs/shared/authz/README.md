# Authorization Guards

This directory contains standardized authorization guards for the Open ERP Backend microservices.

## Overview

All guards have been centralized in this shared library to:
- **Eliminate duplication** across microservices
- **Enable independent operation** without tight coupling
- **Support SYSTEM_ADMIN bypass** for administrative operations
- **Provide extensibility** through resolver interfaces

## Available Guards

### JwtAuthGuard

Validates JWT Bearer tokens and sets user context in the request.

**Features:**
- Validates JWT signature using shared secret
- Extracts user information from token payload
- Sets `request.user` for downstream use
- Supports `@Public()` decorator for public routes

**Usage:**
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, UserContext } from '@shared/authz';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: UserContext) {
    return { userId: user.userId, email: user.email };
  }
}
```

### PermissionsGuard

Enforces permission-based access control with scope awareness (global/organization).

**Features:**
- **Works independently** - can resolve user from token without JwtAuthGuard
- Supports SYSTEM_ADMIN bypass with audit logging
- Organization/tenant-scoped permission checking
- Supports `@Permissions()` decorator with flexible modes (all/any)
- Extensible via ITokenResolver and IUserResolver interfaces

**Usage:**

With JwtAuthGuard (recommended):
```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  @Post()
  @Permissions(Permission.USER_CREATE)
  async createUser() {
    // User is authenticated and has USER_CREATE permission
  }
}
```

Standalone (independent):
```typescript
@Controller('users')
@UseGuards(PermissionsGuard) // No JwtAuthGuard needed!
export class UserController {
  @Post()
  @Permissions(Permission.USER_CREATE)
  async createUser() {
    // PermissionsGuard will resolve user from Authorization header
  }
}
```

Multiple permissions (all required by default):
```typescript
@Post('admin')
@Permissions([Permission.USER_CREATE, Permission.USER_MANAGE])
async createAdminUser() {
  // User must have BOTH permissions
}
```

Multiple permissions (any required):
```typescript
@Delete(':id')
@Permissions([Permission.USER_DELETE, Permission.USER_MANAGE], { mode: 'any' })
async deleteUser() {
  // User must have at least ONE of these permissions
}
```

### RolesGuard

Enforces role-based access control.

**Features:**
- Works independently - can resolve user from token
- Supports SYSTEM_ADMIN bypass with audit logging
- Supports `@Roles()` decorator

**Usage:**
```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { RolesGuard, Roles } from '@shared/authz';
import { Role } from '@shared/types';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('settings')
  @Roles(Role.SYSTEM_ADMIN)
  async getSettings() {
    // Only SYSTEM_ADMIN can access
  }

  @Post('departments')
  @Roles([Role.ORGANIZATION_ADMIN, Role.MANAGER])
  async createDepartment() {
    // Organization admins and managers can access
  }
}
```

## Decorators

### @Public()

Marks a route as public, bypassing all authentication/authorization checks.

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto) {
    // No authentication required
  }
}
```

### @Permissions(permissions, options?)

Specifies required permissions for a route.

**Parameters:**
- `permissions`: string or string[] - Permission(s) required
- `options.scope`: 'global' | 'organization' - Permission scope (default: 'organization')
- `options.mode`: 'all' | 'any' - How to evaluate multiple permissions (default: 'all')

```typescript
// Single permission
@Permissions(Permission.ORDER_READ)

// Multiple permissions (all required)
@Permissions([Permission.ORDER_CREATE, Permission.ORDER_UPDATE])

// Multiple permissions (any required)
@Permissions([Permission.ORDER_DELETE, Permission.ORDER_MANAGE], { mode: 'any' })

// Global scope
@Permissions(Permission.SYSTEM_ADMIN, { scope: 'global' })
```

### @Roles(roles)

Specifies required roles for a route.

```typescript
// Single role
@Roles(Role.ADMIN)

// Multiple roles (user must have at least one)
@Roles([Role.ORGANIZATION_ADMIN, Role.MANAGER])
```

### @CurrentUser()

Parameter decorator to extract the authenticated user from the request.

```typescript
@Get('me')
async getMe(@CurrentUser() user: UserContext) {
  return { userId: user.userId, email: user.email };
}
```

## SYSTEM_ADMIN Bypass

All guards support automatic bypass for users with the `SYSTEM_ADMIN` role:

- Permission checks are skipped
- Role checks are skipped
- Access is logged for audit purposes

**Audit Log Example:**
```json
{
  "message": "SYSTEM_ADMIN bypass used",
  "userId": "admin123",
  "route": "POST /api/users",
  "correlationId": "abc-123",
  "timestamp": "2024-01-08T12:00:00Z"
}
```

## Extensibility

### Custom Token Resolver

Implement `ITokenResolver` to customize token verification:

```typescript
import { Injectable } from '@nestjs/common';
import { ITokenResolver, UserContext } from '@shared/authz';

@Injectable()
export class CustomTokenResolver implements ITokenResolver {
  async resolveToken(token: string): Promise<UserContext | null> {
    // Call external auth service, verify with public key, etc.
    const user = await this.authService.verifyToken(token);
    return user ? {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    } : null;
  }
}

// In module:
@Module({
  providers: [
    PermissionsGuard,
    {
      provide: ITokenResolver,
      useClass: CustomTokenResolver,
    },
  ],
})
export class AppModule {}
```

### Custom User Resolver

Implement `IUserResolver` for RPC-based user resolution:

```typescript
import { Injectable } from '@nestjs/common';
import { IUserResolver, UserContext } from '@shared/authz';

@Injectable()
export class RpcUserResolver implements IUserResolver {
  constructor(private authClient: ClientProxy) {}

  async resolveUser(userId: string): Promise<UserContext | null> {
    return this.authClient.send('user.get', userId).toPromise();
  }

  async resolveUserFromToken(token: string): Promise<UserContext | null> {
    return this.authClient.send('auth.verify', token).toPromise();
  }
}
```

## Configuration

### Environment Variables

- `JWT_SECRET`: Secret key for JWT verification (required in production)
- `NODE_ENV`: Environment mode (affects JWT_SECRET validation)

### Module Setup

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { 
  PermissionsGuard, 
  RolesGuard,
  AuthorizationService 
} from '@shared/authz';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [
    AuthorizationService,
    PermissionsGuard,
    RolesGuard,
  ],
  exports: [AuthorizationService],
})
export class AuthModule {}
```

## Migration Guide

### Step 1: Update Imports

Replace local guard imports with shared guards:

**Before:**
```typescript
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
```

**After:**
```typescript
import { JwtAuthGuard } from '@shared/authz';
```

### Step 2: Update Guard Files

Replace duplicate guard implementations:

**apps/your-service/src/guards/jwt-auth.guard.ts:**
```typescript
import { JwtAuthGuard } from '@shared/authz';

// Re-export for backward compatibility
export { JwtAuthGuard };
```

### Step 3: Remove Duplicate Utils

Delete duplicate token utility files from individual apps and use shared utilities:

```typescript
import { verifyToken, extractBearerToken } from '@shared/authz';
```

### Step 4: Update Module Providers

Ensure AuthorizationService is available:

```typescript
import { AuthorizationService } from '@shared/authz';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [
    AuthorizationService,
    // ... other providers
  ],
})
```

### Step 5: Test

Run tests to ensure everything works:

```bash
npm test
npm run build
```

## Testing

### Unit Tests

Tests are provided for each guard:
- `jwt-auth.guard.spec.ts` - JWT authentication tests
- `permissions.guard.spec.ts` - Permission-based authorization tests
- `roles.guard.spec.ts` - Role-based authorization tests
- `utils/token.util.spec.ts` - Token utility tests

Run tests:
```bash
npm test -- libs/shared/authz
```

### Integration Tests

Test guards in a real controller:

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('PermissionsGuard Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // ... setup
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should allow access with valid token and permissions', () => {
    const token = generateValidToken();
    return request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should deny access without token', () => {
    return request(app.getHttpServer())
      .get('/protected')
      .expect(401);
  });
});
```

## Best Practices

1. **Use JwtAuthGuard + PermissionsGuard together** for most routes
2. **Use PermissionsGuard alone** only when you need independent operation
3. **Use @Public() sparingly** - only for truly public endpoints
4. **Always validate JWT_SECRET** in production environments
5. **Monitor SYSTEM_ADMIN bypass logs** for security audits
6. **Use organization scope** for tenant-specific permissions
7. **Use mode: 'any'** only when multiple permission options are acceptable

## Troubleshooting

### Guard not working after migration

**Problem:** Guard returns 401/403 unexpectedly

**Solution:**
1. Check JWT_SECRET is set correctly
2. Verify AuthorizationService is provided in module
3. Ensure User and Role schemas are imported
4. Check token format (must be "Bearer <token>")

### SYSTEM_ADMIN bypass not working

**Problem:** Admin users still see 403 errors

**Solution:**
1. Verify user has `SYSTEM_ADMIN` in roles array
2. Check user.roles is properly populated in token
3. Review audit logs to see if bypass is triggered

### Permission check fails

**Problem:** User has permission but guard denies access

**Solution:**
1. Check permission scope (global vs organization)
2. Verify organizationId in token matches request
3. Review permission mode (all vs any)
4. Check AuthorizationService.hasPermission logic

## Support

For issues or questions, please contact the platform team or create an issue in the repository.
