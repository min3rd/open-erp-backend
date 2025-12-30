/**
 * Example NestJS Guard and Decorator for Permission Checking
 * 
 * This file demonstrates how to integrate the PermissionService
 * into your NestJS controllers for authorization.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '@shared/services';

/**
 * Metadata key for permission requirements
 */
const PERMISSIONS_KEY = 'permissions';

/**
 * Metadata key for permission check mode (all or any)
 */
const PERMISSION_MODE_KEY = 'permissionMode';

/**
 * Permission check mode
 */
export type PermissionCheckMode = 'all' | 'any';

/**
 * Decorator to specify required permissions for a route
 * @param permissions - Array of permission strings required
 * @param mode - 'all' (default) requires all permissions, 'any' requires at least one
 * 
 * @example
 * ```typescript
 * @Get('users')
 * @RequirePermissions([Permission.USER_READ])
 * async getUsers() {
 *   // Only users with USER_READ permission can access
 * }
 * 
 * @Post('users')
 * @RequirePermissions([Permission.USER_CREATE, Permission.USER_MANAGE], 'any')
 * async createUser() {
 *   // Users need either USER_CREATE or USER_MANAGE permission
 * }
 * ```
 */
export const RequirePermissions = (
  permissions: string[],
  mode: PermissionCheckMode = 'all',
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    SetMetadata(PERMISSION_MODE_KEY, mode)(target, propertyKey, descriptor);
  };
};

/**
 * Guard to check user permissions before allowing access to a route
 * 
 * Usage:
 * 1. Add to module providers
 * 2. Use with @UseGuards decorator on controllers/routes
 * 3. Combine with @RequirePermissions decorator to specify required permissions
 * 
 * @example
 * ```typescript
 * // In your module
 * @Module({
 *   imports: [
 *     MongooseModule.forFeature([
 *       { name: User.name, schema: UserSchema },
 *       { name: Role.name, schema: RoleSchema },
 *     ]),
 *   ],
 *   providers: [PermissionService, PermissionsGuard],
 *   exports: [PermissionService],
 * })
 * export class AuthModule {}
 * 
 * // In your controller
 * @Controller('users')
 * @UseGuards(PermissionsGuard)
 * export class UsersController {
 *   @Get()
 *   @RequirePermissions([Permission.USER_READ])
 *   async findAll() {
 *     // ...
 *   }
 * }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from metadata
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get permission check mode (all or any)
    const mode = this.reflector.get<PermissionCheckMode>(
      PERMISSION_MODE_KEY,
      context.getHandler(),
    ) || 'all';

    // Get user from request (assumes authentication middleware has set it)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check permissions based on mode
    let hasPermission: boolean;

    if (mode === 'any') {
      hasPermission = await this.permissionService.hasAnyPermission(
        user.id,
        requiredPermissions,
      );
    } else {
      hasPermission = await this.permissionService.hasAllPermissions(
        user.id,
        requiredPermissions,
      );
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')} (${mode})`,
      );
    }

    return true;
  }
}

/**
 * Tenant context guard
 * Ensures that the user belongs to the tenant they're trying to access
 * 
 * @example
 * ```typescript
 * @Controller('tenants/:tenantId/users')
 * @UseGuards(TenantContextGuard, PermissionsGuard)
 * export class TenantUsersController {
 *   @Get()
 *   @RequirePermissions([Permission.USER_READ])
 *   async findAll(@Param('tenantId') tenantId: string) {
 *     // User's tenantId must match the URL tenantId
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.params.tenantId || request.query.tenantId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Allow if no tenantId in URL (accessing own tenant resources)
    if (!tenantId) {
      return true;
    }

    // Check if user's tenantId matches the requested tenantId
    if (user.tenantId.toString() !== tenantId) {
      throw new ForbiddenException(
        'Access denied. You cannot access resources from another tenant.',
      );
    }

    return true;
  }
}

/**
 * Example controller demonstrating permission-based access control
 */
/*
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard, TenantContextGuard, RequirePermissions } from './guards/permissions.guard';
import { Permission } from '@shared/types';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions([Permission.USER_READ])
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions([Permission.USER_READ])
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions([Permission.USER_CREATE])
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @RequirePermissions([Permission.USER_UPDATE])
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions([Permission.USER_DELETE, Permission.USER_MANAGE], 'any')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/roles')
  @RequirePermissions([Permission.ROLE_ASSIGN])
  async assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(id, assignRoleDto);
  }
}

// Example with tenant context
@Controller('tenants/:tenantId/departments')
@UseGuards(TenantContextGuard, PermissionsGuard)
export class TenantDepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions([Permission.DEPARTMENT_READ])
  async findAll(@Param('tenantId') tenantId: string) {
    // tenantId is automatically validated by TenantContextGuard
    return this.departmentsService.findAll(tenantId);
  }

  @Post()
  @RequirePermissions([Permission.DEPARTMENT_CREATE])
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(tenantId, createDepartmentDto);
  }
}
*/
