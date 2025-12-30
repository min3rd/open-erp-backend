/**
 * Example Controller demonstrating RBAC middleware and decorators usage
 * 
 * This example shows how to use @Public, @Permissions, @Roles decorators
 * with the PermissionsGuard for comprehensive authorization control.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Public, Permissions, Roles } from '@shared/authz';
import { PermissionsGuard } from '@shared/authz';
import { Permission } from '@shared/types';

/**
 * Example: Orders Controller with various authorization patterns
 */
@Controller('orders')
@UseGuards(PermissionsGuard)
export class OrdersController {
  /**
   * Public endpoint - no authentication required
   */
  @Get('catalog')
  @Public()
  async getPublicCatalog() {
    return { message: 'Public catalog accessible to everyone' };
  }

  /**
   * Tenant-scoped permission check (default scope)
   * User must have 'order.read' permission within their tenant
   */
  @Get()
  @Permissions(Permission.ORDER_READ)
  async getOrders() {
    return { message: 'Orders for current tenant' };
  }

  /**
   * Single permission required with explicit tenant scope
   */
  @Get(':id')
  @Permissions(Permission.ORDER_READ, { scope: 'tenant' })
  async getOrder(@Param('id') id: string) {
    return { message: `Order ${id} details` };
  }

  /**
   * Multiple permissions required (all by default)
   * User must have BOTH 'order.create' AND 'order.update' permissions
   */
  @Post()
  @Permissions([Permission.ORDER_CREATE, Permission.ORDER_UPDATE])
  async createOrder(@Body() orderData: any) {
    return { message: 'Order created', data: orderData };
  }

  /**
   * Multiple permissions with "any" mode (OR logic)
   * User needs EITHER 'order.delete' OR 'order.manage' permission
   */
  @Delete(':id')
  @Permissions([Permission.ORDER_DELETE, Permission.ORDER_MANAGE], {
    mode: 'any',
  })
  async deleteOrder(@Param('id') id: string) {
    return { message: `Order ${id} deleted` };
  }

  /**
   * Approval endpoint requiring specific permission
   */
  @Put(':id/approve')
  @Permissions(Permission.ORDER_APPROVE)
  async approveOrder(@Param('id') id: string) {
    return { message: `Order ${id} approved` };
  }

  /**
   * Role-based authorization
   * User must have TENANT_ADMIN or MANAGER role
   */
  @Get('reports')
  @Roles(['TENANT_ADMIN', 'MANAGER'])
  async getOrderReports() {
    return { message: 'Order reports for admins and managers' };
  }
}

/**
 * Example: Admin Controller with global scope permissions
 */
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminController {
  /**
   * Global scope permission check
   * User must have 'system.admin' permission globally (not tenant-specific)
   */
  @Get('users')
  @Permissions(Permission.SYSTEM_ADMIN, { scope: 'global' })
  async getAllUsers() {
    return { message: 'All users across all tenants' };
  }

  /**
   * Global system configuration
   * Requires either SYSTEM_ADMIN or SYSTEM_CONFIG permission globally
   */
  @Post('settings')
  @Permissions([Permission.SYSTEM_ADMIN, Permission.SYSTEM_CONFIG], {
    scope: 'global',
    mode: 'any',
  })
  async updateSystemSettings(@Body() settings: any) {
    return { message: 'System settings updated', data: settings };
  }

  /**
   * System admin role shortcut
   */
  @Get('logs')
  @Roles('SYSTEM_ADMIN')
  async getSystemLogs() {
    return { message: 'System logs' };
  }
}

/**
 * Example: Tenant-specific Resource Controller
 */
@Controller('tenants/:tenantId/departments')
@UseGuards(PermissionsGuard)
export class TenantDepartmentsController {
  /**
   * Access department within a specific tenant
   * The guard will validate:
   * 1. User has the required permission
   * 2. User belongs to the tenant in the URL (or is system admin)
   */
  @Get()
  @Permissions(Permission.DEPARTMENT_READ)
  async getDepartments(@Param('tenantId') tenantId: string) {
    return { message: `Departments for tenant ${tenantId}` };
  }

  /**
   * Create department within tenant
   */
  @Post()
  @Permissions(Permission.DEPARTMENT_CREATE)
  async createDepartment(
    @Param('tenantId') tenantId: string,
    @Body() departmentData: any,
  ) {
    return {
      message: `Department created in tenant ${tenantId}`,
      data: departmentData,
    };
  }

  /**
   * Manage department - requires tenant admin role
   */
  @Put(':id')
  @Roles('TENANT_ADMIN')
  async updateDepartment(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return {
      message: `Department ${id} updated in tenant ${tenantId}`,
      data: updateData,
    };
  }
}

/**
 * Example: User Management with mixed authorization
 */
@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  /**
   * Authenticated endpoint without specific permission
   * Any authenticated user can access
   */
  @Get('me')
  async getCurrentUser() {
    return { message: 'Current user profile' };
  }

  /**
   * List users within tenant
   */
  @Get()
  @Permissions(Permission.USER_READ)
  async getUsers() {
    return { message: 'Users list' };
  }

  /**
   * Create user - requires permission
   */
  @Post()
  @Permissions(Permission.USER_CREATE)
  async createUser(@Body() userData: any) {
    return { message: 'User created', data: userData };
  }

  /**
   * Update user - needs either USER_UPDATE or USER_MANAGE
   */
  @Put(':id')
  @Permissions([Permission.USER_UPDATE, Permission.USER_MANAGE], {
    mode: 'any',
  })
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return { message: `User ${id} updated`, data: updateData };
  }

  /**
   * Assign role - special permission required
   */
  @Post(':id/roles')
  @Permissions(Permission.ROLE_ASSIGN)
  async assignRole(@Param('id') id: string, @Body() roleData: any) {
    return { message: `Role assigned to user ${id}`, data: roleData };
  }

  /**
   * Delete user - sensitive operation, needs specific permission
   */
  @Delete(':id')
  @Permissions(Permission.USER_DELETE)
  async deleteUser(@Param('id') id: string) {
    return { message: `User ${id} deleted` };
  }
}

/**
 * Example: Public API Controller
 */
@Controller('public')
export class PublicApiController {
  /**
   * No guard needed for fully public endpoints
   * Or use @Public() decorator if guard is applied globally
   */
  @Get('health')
  @Public()
  async healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('version')
  @Public()
  async getVersion() {
    return { version: '1.0.0', api: 'open-erp-backend' };
  }
}

/**
 * Module configuration example
 */
/*
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
  controllers: [
    OrdersController,
    AdminController,
    TenantDepartmentsController,
    UsersController,
    PublicApiController,
  ],
  providers: [
    AuthorizationService,
    {
      // Apply guard globally to all routes
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
*/

/**
 * Usage Notes:
 * 
 * 1. Scope Behavior:
 *    - 'tenant' (default): Checks permissions within user's tenant context
 *    - 'global': Checks permissions globally (for system-wide operations)
 * 
 * 2. Mode Behavior:
 *    - 'all' (default): User must have ALL listed permissions (AND logic)
 *    - 'any': User must have at least ONE listed permission (OR logic)
 * 
 * 3. Cross-tenant Access:
 *    - Users with SYSTEM_ADMIN role can access resources across tenants
 *    - Regular users are restricted to their own tenant
 * 
 * 4. TenantId Resolution:
 *    - Priority: JWT claim > Route param > Header (x-tenant-id)
 *    - Guard validates tenant consistency automatically
 * 
 * 5. Error Responses:
 *    - AUTH_UNAUTHORIZED (401): User not authenticated
 *    - AUTH_INSUFFICIENT_PERMISSIONS (403): Missing required permissions
 *    - AUTH_FORBIDDEN_CROSS_TENANT (403): Cross-tenant access denied
 * 
 * 6. Logging:
 *    - All deny decisions are logged with structured format
 *    - Includes correlationId, userId, route, reason, required permissions
 *    - Metrics counters track allow/deny/missing_permissions
 */
