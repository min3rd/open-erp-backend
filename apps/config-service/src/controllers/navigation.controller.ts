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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
import { ReorderNavigationDto } from '../dto/reorder-navigation.dto';
import {
  NavigationScope,
  NavigationFormat,
} from '../schemas/navigation.schema';
import {
  JwtAuthGuard,
  PermissionsGuard,
  CurrentUser,
  UserContext,
} from '@shared/authz';
import { Permissions, Roles } from '@shared/authz/decorators';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Permission, Role, RoleGroups } from '@shared/types';
import { ok, fetched, created, updated, deleted } from '@shared/response';
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
    enum: NavigationFormat,
    description: 'Response format (default: tree)',
    example: NavigationFormat.TREE,
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
                moduleId: { type: 'string', nullable: true },
                format: { type: 'string', example: NavigationFormat.TREE },
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
  @ApiResponse({ status: 400, description: 'Bad Request (missing moduleId)' })
  async getUserNavigation(
    @CurrentUser() user: UserContext,
    @Query('scope') scopeParam?: string,
    @Query('moduleId') moduleId?: string,
    @Query('format') formatParam?: string,
    @Headers('if-none-match') ifNoneMatch?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const scope = (scopeParam as NavigationScope) || NavigationScope.GLOBAL;
    const format = (formatParam as NavigationFormat) || NavigationFormat.TREE;

    const items = await this.navigationService.getUserNavigation(
      user.userId,
      scope,
      moduleId,
      format,
    );

    const response = {
      items,
      scope,
      moduleId,
      format,
      total: items.length,
    };

    // Generate ETag for caching
    const etag = this.generateETag(response);

    // Check if client has cached version
    if (ifNoneMatch && ifNoneMatch === etag) {
      // Set status to 304 and return empty body
      if (res) {
        res.status(HttpStatus.NOT_MODIFIED);
      }
      return;
    }

    return fetched(response, 'Navigation retrieved successfully', { etag });
  }

  @Get('preview')
  @Roles([Role.SUPER_ADMIN])
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
    name: 'moduleId',
    required: false,
    type: String,
    description: 'Module identifier (required when scope=module)',
    example: 'inventory',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: NavigationFormat,
    description: 'Response format (default: tree)',
    example: NavigationFormat.TREE,
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
                moduleId: { type: 'string', nullable: true },
                format: { type: 'string', example: NavigationFormat.TREE },
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
    @Query('moduleId') moduleId?: string,
    @Query('format') formatParam?: string,
  ) {
    const scope = (scopeParam as NavigationScope) || NavigationScope.GLOBAL;
    const format = (formatParam as NavigationFormat) || NavigationFormat.TREE;

    const items = await this.navigationService.previewNavigationAsRole(
      asRole,
      scope,
      moduleId,
      format,
    );

    const response = {
      items,
      scope,
      moduleId,
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
            item: { $ref: '#/components/schemas/NavigationResponseDto' },
          },
        },
      },
    },
  })
  async getGlobalNavigation(@Query('permissions') permissionsParam?: string) {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    const items = await this.navigationService.getGlobalNavigation(permissions);

    const response = {
      items,
      scope: NavigationScope.GLOBAL,
      total: items.length,
    };

    return fetched(response, 'Global navigation retrieved successfully');
  }

  // ========================================
  // Module Navigation Endpoints
  // ========================================

  @Get('module/:moduleId')
  @Permissions(Permission.NAVIGATION_READ)
  @ApiOperation({
    summary: 'Get module-specific navigation tree',
    description: 'Returns navigation tree scoped to the specified module',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module identifier',
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
            item: { $ref: '#/components/schemas/NavigationResponseDto' },
          },
        },
      },
    },
  })
  async getModuleNavigation(
    @Param('moduleId') moduleId: string,
    @Query('permissions') permissionsParam?: string,
  ) {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    const items = await this.navigationService.getModuleNavigation(
      moduleId,
      permissions,
    );

    const response = {
      items,
      scope: NavigationScope.MODULE,
      moduleId,
      total: items.length,
    };

    return fetched(
      response,
      `Module navigation for '${moduleId}' retrieved successfully`,
    );
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
              type: 'array',
              items: { $ref: '#/components/schemas/NavigationItemDto' },
            },
          },
        },
      },
    },
  })
  async searchNavigation(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const results = await this.navigationService.searchNavigation(query, limit);
    return fetched(results, `Found ${results.length} navigation items`);
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
            item: { $ref: '#/components/schemas/NavigationItemDto' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  async getNavigationById(
    @Param('id') id: string,
    @Query('permissions') permissionsParam?: string,
  ) {
    const permissions = permissionsParam
      ? permissionsParam.split(',').map((p) => p.trim())
      : undefined;

    const item = await this.navigationService.getNavigationById(
      id,
      permissions,
    );
    return fetched(item, 'Navigation item retrieved successfully');
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation item created successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'create' },
            item: { $ref: '#/components/schemas/NavigationItemDto' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  async createNavigation(
    @Body() dto: CreateNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.createNavigation(
      dto,
      userId,
    );
    const item = await this.navigationService.getNavigationById(navigation.id);
    return created(item, 'Navigation item created successfully');
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation item updated successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: { $ref: '#/components/schemas/NavigationItemDto' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateNavigation(
    @Param('id') id: string,
    @Body() dto: UpdateNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.updateNavigation(
      id,
      dto,
      userId,
    );
    const item = await this.navigationService.getNavigationById(navigation.id);
    return updated(item, 'Navigation item updated successfully');
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation item deleted successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'delete' },
            item: { type: 'null' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Navigation item not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteNavigation(
    @Param('id') id: string,
    @Query('cascade', new DefaultValuePipe(true), ParseBoolPipe)
    cascade: boolean,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId || 'system';
    await this.navigationService.deleteNavigation(id, userId, cascade);
    return deleted('Navigation item deleted successfully');
  }

  // ========================================
  // Special Operations
  // ========================================

  @Post('reorder')
  @Roles(RoleGroups.NAVIGATION_ADMINS)
  @ApiOperation({
    summary: 'Reorder navigation items',
    description:
      'Updates the order and/or parent of multiple navigation items. Only admins can manage navigation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation items reordered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation items reordered successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: { type: 'null' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async reorderNavigation(
    @Body() dto: ReorderNavigationDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    const userId = req.user?.userId || 'system';
    await this.navigationService.reorderNavigation(dto, userId);
    return updated(null, 'Navigation items reordered successfully');
  }

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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation item moved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'update' },
            item: { $ref: '#/components/schemas/NavigationItemDto' },
          },
        },
      },
    },
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
  ) {
    const userId = req.user?.userId || 'system';
    const navigation = await this.navigationService.moveNavigation(
      id,
      dto,
      userId,
    );
    const item = await this.navigationService.getNavigationById(navigation.id);
    return updated(item, 'Navigation item moved successfully');
  }

  // ========================================
  // Cache Management
  // ========================================

  @Post('cache/reload')
  @Roles([Role.SUPER_ADMIN])
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
    name: 'moduleId',
    required: false,
    type: String,
    description: 'Module identifier (when scope is module)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache reloaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Navigation cache reloaded successfully',
        },
        error: { type: 'null' },
        data: { type: 'null' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.OK)
  async reloadCache(
    @Query('scope') scope?: string,
    @Query('moduleId') moduleId?: string,
  ) {
    const navigationScope = scope as NavigationScope | undefined;
    await this.navigationService.reloadCache(navigationScope, moduleId);
    return ok(null, 'Navigation cache reloaded successfully');
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Generate ETag for navigation response
   * @param data Response data to hash
   * @returns ETag string
   * Note: Using MD5 for ETag generation (not for security, just for cache validation)
   */
  private generateETag(data: any): string {
    // MD5 is sufficient for ETags (cache validation, not security)
    // It's fast and collision risk is acceptable for this use case
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash}"`;
  }
}
