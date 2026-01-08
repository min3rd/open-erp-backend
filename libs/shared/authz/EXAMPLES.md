# Guard Usage Examples

This document provides practical examples of using the standardized guards in various scenarios.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Independent PermissionsGuard](#independent-permissionsguard)
- [Custom Resolvers](#custom-resolvers)
- [Combined Guards](#combined-guards)
- [SYSTEM_ADMIN Bypass](#system_admin-bypass)

## Basic Usage

### Simple JWT Authentication

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, UserContext } from '@shared/authz';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  async getProfile(@CurrentUser() user: UserContext) {
    return {
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
    };
  }
}
```

### Permission-Based Access

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  @Post()
  @Permissions(Permission.USER_CREATE)
  async createUser(@Body() createUserDto: CreateUserDto) {
    // User is authenticated and has USER_CREATE permission
    return this.userService.create(createUserDto);
  }

  @Delete(':id')
  @Permissions([Permission.USER_DELETE, Permission.USER_MANAGE], { mode: 'any' })
  async deleteUser(@Param('id') id: string) {
    // User must have either USER_DELETE or USER_MANAGE permission
    return this.userService.delete(id);
  }
}
```

### Role-Based Access

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard, Roles } from '@shared/authz';
import { Role } from '@shared/types';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('settings')
  @Roles(Role.SYSTEM_ADMIN)
  async getSettings() {
    // Only SYSTEM_ADMIN can access
    return this.settingsService.getAll();
  }

  @Post('departments')
  @Roles([Role.ORGANIZATION_ADMIN, Role.MANAGER])
  async createDepartment(@Body() createDto: CreateDepartmentDto) {
    // Organization admins and managers can access
    return this.departmentService.create(createDto);
  }
}
```

## Independent PermissionsGuard

PermissionsGuard can work independently without JwtAuthGuard, resolving user context from the Authorization header itself:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions, CurrentUser } from '@shared/authz';
import { Permission } from '@shared/types';

/**
 * Example: Using PermissionsGuard without JwtAuthGuard
 * The guard will automatically resolve user from Authorization header
 */
@Controller('orders')
@UseGuards(PermissionsGuard) // No JwtAuthGuard needed!
export class OrderController {
  @Get()
  @Permissions(Permission.ORDER_READ)
  async listOrders(@CurrentUser() user: UserContext) {
    // PermissionsGuard resolved user from token
    return this.orderService.findAll(user.organizationId);
  }

  @Post()
  @Permissions([Permission.ORDER_CREATE, Permission.ORDER_UPDATE])
  async createOrder(
    @CurrentUser() user: UserContext,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    // User has both permissions and was resolved independently
    return this.orderService.create(createOrderDto, user.userId);
  }
}
```

**How it works:**
1. PermissionsGuard checks if `request.user` exists
2. If not, it extracts token from Authorization header
3. It verifies the token using JWT_SECRET
4. Sets `request.user` for downstream use
5. Then performs permission checks

## Custom Resolvers

### Custom Token Resolver via RPC

```typescript
import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ITokenResolver, UserContext } from '@shared/authz';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RpcTokenResolver implements ITokenResolver {
  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}

  async resolveToken(token: string): Promise<UserContext | null> {
    try {
      const user = await firstValueFrom(
        this.authClient.send('auth.verifyToken', { token }),
      );
      
      return user ? {
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId,
        roles: user.roles,
      } : null;
    } catch (error) {
      console.error('Failed to resolve token via RPC:', error);
      return null;
    }
  }
}

// Register in module
@Module({
  providers: [
    RpcTokenResolver,
    {
      provide: ITokenResolver,
      useExisting: RpcTokenResolver,
    },
    PermissionsGuard,
  ],
})
export class AppModule {}
```

### Custom User Resolver with Caching

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ClientProxy } from '@nestjs/microservices';
import { IUserResolver, UserContext } from '@shared/authz';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CachedUserResolver implements IUserResolver {
  constructor(
    @Inject('USER_SERVICE') private userClient: ClientProxy,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async resolveUser(userId: string): Promise<UserContext | null> {
    // Check cache first
    const cacheKey = `user:${userId}`;
    const cached = await this.cacheManager.get<UserContext>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Fetch from service
    try {
      const user = await firstValueFrom(
        this.userClient.send('user.get', { userId }),
      );

      if (user) {
        const userContext: UserContext = {
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          roles: user.roles,
        };
        
        // Cache for 5 minutes
        await this.cacheManager.set(cacheKey, userContext, 300000);
        return userContext;
      }
    } catch (error) {
      console.error('Failed to resolve user:', error);
    }

    return null;
  }

  async resolveUserFromToken(token: string): Promise<UserContext | null> {
    try {
      const result = await firstValueFrom(
        this.userClient.send('auth.verify', { token }),
      );
      
      return result ? {
        userId: result.userId,
        email: result.email,
        organizationId: result.organizationId,
        roles: result.roles,
      } : null;
    } catch (error) {
      console.error('Failed to resolve user from token:', error);
      return null;
    }
  }
}
```

## Combined Guards

### Full Stack: JWT + Permissions + Throttle

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
export class OrderController {
  @Post()
  @Permissions(Permission.ORDER_CREATE)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    // Protected by:
    // 1. JWT authentication
    // 2. ORDER_CREATE permission
    // 3. Rate limiting (throttle)
    return this.orderService.create(createOrderDto);
  }
}
```

### Class-Level and Method-Level Guards

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '@shared/authz';
import { Permissions, Roles, Public } from '@shared/authz';
import { Permission, Role } from '@shared/types';

@Controller('products')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class ProductController {
  @Get()
  @Public() // Override: This route is public
  async listProducts() {
    return this.productService.findAll();
  }

  @Get(':id')
  @Public() // Public route
  async getProduct(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard) // Add permission check
  @Permissions(Permission.PRODUCT_CREATE)
  async createProduct(@Body() createDto: CreateProductDto) {
    return this.productService.create(createDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) // Add role check
  @Roles([Role.ORGANIZATION_ADMIN, Role.MANAGER])
  async deleteProduct(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
```

## SYSTEM_ADMIN Bypass

SYSTEM_ADMIN users automatically bypass all permission and role checks:

```typescript
import { Controller, Delete, UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions, CurrentUser } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('sensitive-data')
@UseGuards(PermissionsGuard)
export class SensitiveDataController {
  @Delete('all')
  @Permissions(Permission.SYSTEM_ADMIN) // Only SYSTEM_ADMIN intended
  async deleteAll(@CurrentUser() user: UserContext) {
    // SYSTEM_ADMIN users bypass the permission check
    // All access is logged for audit purposes
    
    this.logger.warn(
      `CRITICAL: User ${user.userId} is deleting all sensitive data`,
    );
    
    return this.dataService.deleteAll();
  }
}
```

**Audit Log Output:**
```json
{
  "level": "info",
  "message": "SYSTEM_ADMIN bypass used",
  "userId": "admin123",
  "route": "DELETE /api/sensitive-data/all",
  "correlationId": "abc-123-xyz",
  "timestamp": "2024-01-08T12:00:00Z"
}
```

## Complex Scenarios

### Multi-Tenant with Organization Scope

```typescript
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions, CurrentUser } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('organizations/:organizationId/departments')
@UseGuards(PermissionsGuard)
export class DepartmentController {
  @Get()
  @Permissions(Permission.DEPARTMENT_READ, { scope: 'organization' })
  async listDepartments(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: UserContext,
  ) {
    // Guard ensures:
    // 1. User is authenticated
    // 2. User has DEPARTMENT_READ permission
    // 3. organizationId matches user's organization (or user is SYSTEM_ADMIN)
    
    return this.departmentService.findAll(organizationId);
  }

  @Post()
  @Permissions(Permission.DEPARTMENT_CREATE, { scope: 'organization' })
  async createDepartment(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateDepartmentDto,
    @CurrentUser() user: UserContext,
  ) {
    // User must be in same organization (unless SYSTEM_ADMIN)
    return this.departmentService.create(organizationId, createDto);
  }
}
```

### Global Scope Operations

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsGuard, Permissions } from '@shared/authz';
import { Permission } from '@shared/types';

@Controller('admin/global')
@UseGuards(PermissionsGuard)
export class GlobalAdminController {
  @Get('users')
  @Permissions(Permission.SYSTEM_ADMIN, { scope: 'global' })
  async listAllUsers() {
    // Global scope: Permission checked across all organizations
    // Typically only SYSTEM_ADMIN has this permission
    return this.userService.findAll();
  }

  @Get('statistics')
  @Permissions(Permission.REPORT_VIEW, { scope: 'global' })
  async getGlobalStatistics() {
    // View reports across all organizations
    return this.statsService.getGlobalStats();
  }
}
```

## Testing Guards

### Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '@shared/authz';
import { AuthorizationService } from '@shared/authz';

describe('OrderController with PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let authService: jest.Mocked<AuthorizationService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: {
            hasAllPermissions: jest.fn(),
            hasAnyRole: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
    authService = module.get(AuthorizationService);
  });

  it('should allow SYSTEM_ADMIN to create order without permission', async () => {
    const user = {
      userId: 'admin123',
      roles: ['SYSTEM_ADMIN'],
    };

    // Setup mock execution context
    const context = createMockContext(user);
    
    const result = await guard.canActivate(context);
    
    expect(result).toBe(true);
    // Permission check should be bypassed
    expect(authService.hasAllPermissions).not.toHaveBeenCalled();
  });
});
```

### Integration Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

describe('PermissionsGuard Integration', () => {
  let app: INestApplication;
  const jwtSecret = 'test-secret';

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;

    const module: TestingModule = await Test.createTestingModule({
      // ... module setup
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should allow access with valid token and permissions', () => {
    const token = jwt.sign(
      {
        sub: 'user123',
        email: 'test@example.com',
        roles: ['USER'],
      },
      jwtSecret,
    );

    return request(app.getHttpServer())
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should deny access without token', () => {
    return request(app.getHttpServer())
      .get('/api/orders')
      .expect(401);
  });

  it('should allow SYSTEM_ADMIN to bypass permissions', () => {
    const token = jwt.sign(
      {
        sub: 'admin123',
        email: 'admin@example.com',
        roles: ['SYSTEM_ADMIN'],
      },
      jwtSecret,
    );

    return request(app.getHttpServer())
      .delete('/api/sensitive-data/all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

## Best Practices

1. **Use JwtAuthGuard + PermissionsGuard** for most HTTP endpoints
2. **Use PermissionsGuard alone** for RPC handlers or when you need flexibility
3. **Always set JWT_SECRET** in production environments
4. **Use organization scope** for tenant-specific operations
5. **Use global scope** only for system-wide administrative operations
6. **Monitor SYSTEM_ADMIN access** via audit logs
7. **Implement custom resolvers** for microservice architectures
8. **Cache user resolution** to improve performance
9. **Test bypass logic** to ensure SYSTEM_ADMIN works correctly
10. **Document guard usage** in your API documentation

## Additional Resources

- [Main README](./README.md) - Full documentation
- [Migration Guide](./README.md#migration-guide) - How to migrate existing code
- [Troubleshooting](./README.md#troubleshooting) - Common issues and solutions
