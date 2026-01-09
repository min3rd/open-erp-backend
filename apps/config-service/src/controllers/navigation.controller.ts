import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { NavigationService } from '../services/navigation.service';
import { CreateNavigationDto } from '../dto/create-navigation.dto';
import { UpdateNavigationDto } from '../dto/update-navigation.dto';
import { MoveNavigationDto } from '../dto/move-navigation.dto';
import {
  NavigationItemDto,
  NavigationResponseDto,
} from '../dto/navigation-response.dto';
import { NavigationScope } from '../schemas/navigation.schema';
import { JwtAuthGuard, PermissionsGuard, CurrentUser, UserContext } from '@shared/authz';
import { Permissions, Roles } from '@shared/authz/decorators';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Permission, Role, RoleGroups } from '@shared/types';
import { ok, fetched } from '@shared/response';
import * as crypto from 'crypto';

@ApiTags('navigations')
@Controller({ path: 'navigations', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
@ApiBearerAuth()
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  // ========================================
  // User-Facing Navigation Endpoints
  // ========================================

  @Get('user')
  @ApiOperation({
    summary: 'Get navigation for authenticated user',
    description:
      'Returns navigation filtered by user permissions. Automatically extracts permissions from JWT token. ' +
      'Supports both tree and flat formats, and can be scoped to global or module level.',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: NavigationScope,
    description: 'Navigation scope (default: global)',
    example: 'global',
  })
  @ApiQuery({
    name: 'moduleKey',
    required: false,
    type: String,
    description: 'Module key (required when scope=module)',
    example: 'inventory',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['tree', 'flat'],
    description: 'Response format (default: tree)',
    example: 'tree',
  })
  @ApiHeader({
    name: 'If-None-Match',
    required: false,
    description: 'ETag for conditional requests',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', nullable: true },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'get' },
            item: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/NavigationItemDto' },
                },
                scope: { type: 'string', example: 'global' },
                module: { type: 'string', nullable: true },
                format: { type: 'string', example: 'tree' },
                total: { type: 'number', example: 10 },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            etag: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 304, description: 'Not Modified (cached)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad Request (missing moduleKey)' })
  async getUserNavigation(
    @CurrentUser() user: UserContext,
    @Query('scope') scopeParam?: string,
    @Query('moduleKey') moduleKey?: string,
    @Query('format') formatParam?: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    const scope = (scopeParam as NavigationScope) || NavigationScope.GLOBAL;
    const format = (formatParam as 'tree' | 'flat') || 'tree';

    const items = await this.navigationService.getUserNavigation(
      user.userId,
      scope,
      moduleKey,
      format,
    );

    const response = {
      items,
      scope,
      module: moduleKey,
      format,
      total: items.length,
    };

    // Generate ETag for caching
    const etag = this.generateETag(response);

    // Check if client has cached version
    if (ifNoneMatch && ifNoneMatch === etag) {
      return {
        statusCode: HttpStatus.NOT_MODIFIED,
      };
    }

    return fetched(response, 'Navigation retrieved successfully', { etag });
  }

  @Get('preview')
  @Roles([Role.SYSTEM_ADMIN])
  @ApiOperation({
    summary: 'Preview navigation as a specific role (admin only)',
    description:
      'Returns navigation as it would appear for a specific role. Only system admins can use this endpoint.',
  })
  @ApiQuery({
    name: 'asRole',
    required: true,
    type: String,
    description: 'Role code to preview as',
    example: 'USER',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: NavigationScope,
    description: 'Navigation scope (default: global)',
    example: 'global',
  })
  @ApiQuery({
    name: 'moduleKey',
    required: false,
    type: String,
    description: 'Module key (required when scope=module)',
    example: 'inventory',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['tree', 'flat'],
    description: 'Response format (default: tree)',
    example: 'tree',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation preview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', nullable: true },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'get' },
            item: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/NavigationItemDto' },
                },
                scope: { type: 'string', example: 'global' },
                module: { type: 'string', nullable: true },
                format: { type: 'string', example: 'tree' },
                total: { type: 'number', example: 10 },
                previewRole: { type: 'string', example: 'USER' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not system admin)' })
  async previewNavigationAsRole(
    @Query('asRole') asRole: string,
    @Query('scope') scopeParam?: string,
    @Query('moduleKey') moduleKey?: string,
    @Query('format') formatParam?: string,
  ) {
    const scope = (scopeParam as NavigationScope) || NavigationScope.GLOBAL;
    const format = (formatParam as 'tree' | 'flat') || 'tree';

    const items = await this.navigationService.previewNavigationAsRole(
      asRole,
      scope,
      moduleKey,
      format,
    );

    const response = {
      items,
      scope,
      module: moduleKey,
      format,
      total: items.length,
      previewRole: asRole,
    };

    return fetched(response, `Navigation preview for role '${asRole}'`);
  }

  // ========================================
  // Global Navigation Endpoints
  // ========================================

  @Get('global')
  @Permissions(Permission.NAVIGATION_READ, { scope: 'global' })
  @ApiOperation({
    summary: 'Get global navigation tree',
    description:
      'Returns the full global navigation tree, optionally filtered by user permissions',
  })
  @ApiQuery({
    name: 'permissions',
    required: false,
    type: String,
    description:
      'Comma-separated list of permission keys to filter navigation items',
    example: 'user.read,user.write',
  })
  @ApiResponse({
    status: 200,
    description: 'Global navigation tree retrieved successfully',
    type: NavigationResponseDto,
  })
  async getGlobalNavigation(
    @Query('permissions') permissionsParam?: string,
  ): Promise<NavigationResponseDto> {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    const items = await this.navigationService.getGlobalNavigation(permissions);

    return {
      items,
      scope: NavigationScope.GLOBAL,
      total: items.length,
    };
  }

  // ========================================
  // Module Navigation Endpoints
  // ========================================

  @Get('module/:moduleKey')
  @Permissions(Permission.NAVIGATION_READ)
  @ApiOperation({
    summary: 'Get module-specific navigation tree',
    description: 'Returns navigation tree scoped to the specified module',
  })
  @ApiParam({
    name: 'moduleKey',
    description: 'Module key identifier',
    example: 'inventory',
  })
  @ApiQuery({
    name: 'permissions',
    required: false,
    type: String,
    description:
      'Comma-separated list of permission keys to filter navigation items',
  })
  @ApiResponse({
    status: 200,
    description: 'Module navigation tree retrieved successfully',
    type: NavigationResponseDto,
  })
  async getModuleNavigation(
    @Param('moduleKey') moduleKey: string,
    @Query('permissions') permissionsParam?: string,
  ): Promise<NavigationResponseDto> {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    const items = await this.navigationService.getModuleNavigation(
      moduleKey,
      permissions,
    );

    return {
      items,
      scope: NavigationScope.MODULE,
      module: moduleKey,
      total: items.length,
    };
  }

  // ========================================
  // Single Item Operations
  // ========================================

  @Get('search')
  @Permissions(Permission.NAVIGATION_READ)
  @ApiOperation({
    summary: 'Search navigation items',
    description:
      'Search for navigation items by label, icon, command, or subtitle',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
    example: 'dashboard',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [NavigationItemDto],
  })
  async searchNavigation(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<any[]> {
    return await this.navigationService.searchNavigation(query, limit);
  }

  @Get(':id')
  @Permissions(Permission.NAVIGATION_READ)
  @ApiOperation({
    summary: 'Get a navigation item by ID',
    description: 'Retrieves a specific navigation item with its children',
  })
  @ApiParam({
    name: 'id',
    description: 'Navigation item ID',
    example: 'nav-dashboard',
  })
  @ApiQuery({
    name: 'permissions',
    required: false,
    type: String,
    description: 'Comma-separated list of permission keys for filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation item retrieved successfully',
    type: NavigationItemDto,
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  async getNavigationById(
    @Param('id') id: string,
    @Query('permissions') permissionsParam?: string,
  ): Promise<NavigationItemDto> {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    return await this.navigationService.getNavigationById(id, permissions);
  }

  @Post()
  @Roles(RoleGroups.NAVIGATION_ADMINS)
  @ApiOperation({
    summary: 'Create a new navigation item',
    description:
      'Creates a new navigation item. Only admins can manage navigation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Navigation item created successfully',
    type: NavigationItemDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  async createNavigation(
    @Body() dto: CreateNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ): Promise<NavigationItemDto> {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.createNavigation(
      dto,
      userId,
    );
    return this.navigationService.getNavigationById(navigation.id);
  }

  @Patch(':id')
  @Roles(RoleGroups.NAVIGATION_ADMINS)
  @ApiOperation({
    summary: 'Update a navigation item',
    description:
      'Updates an existing navigation item. Only admins can manage navigation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Navigation item ID',
    example: 'nav-dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation item updated successfully',
    type: NavigationItemDto,
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateNavigation(
    @Param('id') id: string,
    @Body() dto: UpdateNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ): Promise<NavigationItemDto> {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.updateNavigation(
      id,
      dto,
      userId,
    );
    return this.navigationService.getNavigationById(navigation.id);
  }

  @Delete(':id')
  @Roles(RoleGroups.NAVIGATION_ADMINS)
  @ApiOperation({
    summary: 'Delete a navigation item',
    description:
      'Deletes a navigation item and optionally its children. Only admins can manage navigation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Navigation item ID',
    example: 'nav-dashboard',
  })
  @ApiQuery({
    name: 'cascade',
    required: false,
    type: Boolean,
    description: 'Whether to delete children recursively (default: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation item deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteNavigation(
    @Param('id') id: string,
    @Query('cascade', new DefaultValuePipe(true), ParseBoolPipe)
    cascade: boolean,
    @Request() req: { user?: { userId?: string } },
  ): Promise<{ message: string }> {
    const userId = req.user?.userId || 'system';
    await this.navigationService.deleteNavigation(id, userId, cascade);
    return { message: 'Navigation item deleted successfully' };
  }

  // ========================================
  // Special Operations
  // ========================================

  @Post(':id/move')
  @Roles(RoleGroups.NAVIGATION_ADMINS)
  @ApiOperation({
    summary: 'Move a navigation item',
    description:
      'Moves a navigation item to a new parent and/or position. Only admins can manage navigation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Navigation item ID to move',
    example: 'nav-settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation item moved successfully',
    type: NavigationItemDto,
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid move operation (cycle detected)',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async moveNavigation(
    @Param('id') id: string,
    @Body() dto: MoveNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ): Promise<NavigationItemDto> {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.moveNavigation(
      id,
      dto,
      userId,
    );
    return this.navigationService.getNavigationById(navigation.id);
  }

  // ========================================
  // Cache Management
  // ========================================

  @Post('cache/reload')
  @Roles([Role.SYSTEM_ADMIN])
  @ApiOperation({
    summary: 'Reload navigation cache',
    description:
      'Invalidates and reloads the navigation cache. Only system admins can perform this operation.',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    type: String,
    description: 'Scope to reload (global or module)',
  })
  @ApiQuery({
    name: 'module',
    required: false,
    type: String,
    description: 'Module key (when scope is module)',
  })
  @ApiResponse({ status: 200, description: 'Cache reloaded successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.OK)
  async reloadCache(
    @Query('scope') scope?: string,
    @Query('module') module?: string,
  ): Promise<{ message: string }> {
    const navigationScope = scope as NavigationScope | undefined;
    await this.navigationService.reloadCache(navigationScope, module);
    return { message: 'Navigation cache reloaded successfully' };
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Generate ETag for navigation response
   * @param data Response data to hash
   * @returns ETag string
   */
  private generateETag(data: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash}"`;
  }
}
