import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NavigationRepository } from '../repositories/navigation.repository';
import {
  Navigation,
  NavigationScope,
  NavigationFormat,
} from '../schemas/navigation.schema';
import { CreateNavigationDto } from '../dto/create-navigation.dto';
import { UpdateNavigationDto } from '../dto/update-navigation.dto';
import { MoveNavigationDto } from '../dto/move-navigation.dto';
import { ReorderNavigationDto } from '../dto/reorder-navigation.dto';
import { NavigationItemDto } from '../dto/navigation-response.dto';
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { RABBITMQ_USER_CLIENT } from '@shared/rabbitmq';
import { AuthorizationService } from '@shared/authz/authorization.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from '@shared/schemas';

// Simple in-memory cache
interface CacheEntry {
  data: NavigationItemDto[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly navigationRepository: NavigationRepository,
    @Inject(RABBITMQ_USER_CLIENT) private readonly userClient: ClientProxy,
    private readonly authorizationService: AuthorizationService,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Get global navigation tree with optional permission filtering
   */
  async getGlobalNavigation(
    permissions?: string[],
  ): Promise<NavigationItemDto[]> {
    const cacheKey = `global:${permissions?.sort().join(',') || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached global navigation');
      return cached;
    }

    const roots = await this.navigationRepository.findRoots(
      NavigationScope.GLOBAL,
    );
    const tree = await this.buildNavigationTree(roots, permissions);

    this.setCache(cacheKey, tree);
    return tree;
  }

  /**
   * Get module-specific navigation tree with optional permission filtering
   */
  async getModuleNavigation(
    moduleId: string,
    permissions?: string[],
  ): Promise<NavigationItemDto[]> {
    const cacheKey = `module:${moduleId}:${permissions?.sort().join(',') || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached navigation for module ${moduleId}`);
      return cached;
    }

    const roots = await this.navigationRepository.findRoots(
      NavigationScope.MODULE,
      moduleId,
    );
    const tree = await this.buildNavigationTree(roots, permissions);

    this.setCache(cacheKey, tree);
    return tree;
  }

  /**
   * Get a single navigation item by ID with its children
   */
  async getNavigationById(
    id: string,
    permissions?: string[],
  ): Promise<NavigationItemDto> {
    const navigation = await this.navigationRepository.findById(id);
    if (!navigation) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    const tree = await this.buildNavigationTree([navigation], permissions);
    if (tree.length === 0) {
      throw new NotFoundException(
        `Navigation item '${id}' not accessible with provided permissions`,
      );
    }

    return tree[0];
  }

  /**
   * Create a new navigation item
   */
  async createNavigation(
    dto: CreateNavigationDto,
    userId: string,
  ): Promise<Navigation> {
    // Validate module scope
    if (dto.scope === NavigationScope.MODULE && !dto.moduleId) {
      throw new BadRequestException(
        'Module identifier is required for module-scoped navigation',
      );
    }

    // Validate parent exists and no cycle
    if (dto.parentId) {
      const parent = await this.navigationRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(
          `Parent navigation item '${dto.parentId}' not found`,
        );
      }

      // Check scope compatibility
      // Allow Module -> Global parenting, but not Global -> Module
      if (
        dto.scope === NavigationScope.GLOBAL &&
        parent.scope === NavigationScope.MODULE
      ) {
        throw new BadRequestException(
          'Global navigation item cannot have a module navigation item as parent',
        );
      }
      // If scopes match, checking module ID
      if (
        dto.scope === NavigationScope.MODULE &&
        parent.scope === NavigationScope.MODULE &&
        dto.moduleId !== parent.moduleId
      ) {
        throw new BadRequestException(
          'Navigation item module must match parent module',
        );
      }
      // Note: We allow current(Module) -> parent(Global)
    }

    // Sanitize inputs to prevent XSS
    this.sanitizeNavigationData(dto);

    const navigation = await this.navigationRepository.create(dto, userId);

    // Invalidate cache
    this.invalidateCache(dto.scope, dto.moduleId);

    // Publish event
    await this.publishEvent(EVENT_NAMES.NAVIGATION.CREATED, navigation, userId);

    this.logger.log(`Navigation item '${dto.id}' created by user ${userId}`);
    return navigation;
  }

  /**
   * Update a navigation item
   */
  async updateNavigation(
    id: string,
    dto: UpdateNavigationDto,
    userId: string,
  ): Promise<Navigation> {
    const existing = await this.navigationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Validate parent change
    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      await this.validateParentChange(id, dto.parentId, existing);
    }

    // Sanitize inputs
    this.sanitizeNavigationData(dto);

    const updated = await this.navigationRepository.update(id, dto, userId);
    if (!updated) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Invalidate cache
    this.invalidateCache(existing.scope, existing.moduleId);

    // Publish event
    await this.publishEvent(EVENT_NAMES.NAVIGATION.UPDATED, updated, userId);

    this.logger.log(`Navigation item '${id}' updated by user ${userId}`);
    return updated;
  }

  /**
   * Delete a navigation item and optionally its children
   */
  async deleteNavigation(
    id: string,
    userId: string,
    cascade: boolean = true,
  ): Promise<void> {
    const navigation = await this.navigationRepository.findById(id);
    if (!navigation) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Check if has children
    const children = await this.navigationRepository.findChildren(id);
    if (children.length > 0 && !cascade) {
      throw new BadRequestException(
        `Navigation item '${id}' has ${children.length} children. Use cascade=true to delete them.`,
      );
    }

    // Delete children if cascade
    if (cascade && children.length > 0) {
      await this.navigationRepository.deleteChildren(id);
      this.logger.log(
        `Deleted ${children.length} children of navigation item '${id}'`,
      );
    }

    // Delete the item
    const deleted = await this.navigationRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Invalidate cache
    this.invalidateCache(navigation.scope, navigation.moduleId);

    // Publish event
    await this.publishEvent(EVENT_NAMES.NAVIGATION.DELETED, navigation, userId);

    this.logger.log(`Navigation item '${id}' deleted by user ${userId}`);
  }

  /**
   * Move a navigation item to a new parent
   */
  async moveNavigation(
    id: string,
    dto: MoveNavigationDto,
    userId: string,
  ): Promise<Navigation> {
    const navigation = await this.navigationRepository.findById(id);
    if (!navigation) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Validate new parent
    if (dto.newParentId !== undefined) {
      await this.validateParentChange(id, dto.newParentId, navigation);
    }

    const updateDto: UpdateNavigationDto = {};
    if (dto.newParentId !== undefined) {
      updateDto.parentId = dto.newParentId || undefined;
    }
    if (dto.order !== undefined) {
      updateDto.order = dto.order;
    }

    const updated = await this.navigationRepository.update(
      id,
      updateDto,
      userId,
    );
    if (!updated) {
      throw new NotFoundException(`Navigation item '${id}' not found`);
    }

    // Invalidate cache
    this.invalidateCache(navigation.scope, navigation.moduleId);

    // Publish event
    await this.publishEvent(EVENT_NAMES.NAVIGATION.MOVED, updated, userId);

    this.logger.log(`Navigation item '${id}' moved by user ${userId}`);
    return updated;
  }

  /**
   * Reorder multiple navigation items
   */
  async reorderNavigation(
    dto: ReorderNavigationDto,
    userId: string,
  ): Promise<void> {
    const { items } = dto;
    if (!items || items.length === 0) {
      return;
    }

    // Process each item update
    for (const item of items) {
      const moveDto: MoveNavigationDto = {
        newParentId: item.newParentId,
        order: item.newOrder,
      };
      // Reuse moveNavigation to ensure consistent validation and events
      // Note: This might emit multiple events, which is acceptable for now.
      // In a more optimized version, we might want to batch updates.
      try {
        await this.moveNavigation(item.id, moveDto, userId);
      } catch (error) {
        this.logger.warn(`Failed to reorder item ${item.id}: ${error.message}`);
        // Continue with other items or throw?
        // For bulk reorder, partial success might be better than full fail if not transactional.
        // But let's fail fast if validation fails.
        throw error;
      }
    }
  }

  /**
   * Search navigation items
   */
  async searchNavigation(
    query: string,
    limit: number = 50,
  ): Promise<Navigation[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    return await this.navigationRepository.search(query, limit);
  }

  /**
   * Get navigation for authenticated user (with auto permission extraction)
   * @param userId User ID from JWT token
   * @param scope Navigation scope (global or module)
   * @param moduleId Module identifier (required when scope=module)
   * @param format Response format (tree or flat)
   * @returns Navigation items in requested format
   */
  async getUserNavigation(
    userId: string,
    scope: NavigationScope,
    moduleId?: string,
    format: NavigationFormat = NavigationFormat.TREE,
  ): Promise<NavigationItemDto[]> {
    // Get user permissions from authorization service
    const permissions = await this.getUserPermissions(userId);

    // Get navigation based on scope
    let tree: NavigationItemDto[];
    if (scope === NavigationScope.GLOBAL) {
      tree = await this.getGlobalNavigation(permissions);
    } else {
      if (!moduleId) {
        throw new BadRequestException(
          'moduleId is required when scope is module',
        );
      }
      tree = await this.getModuleNavigation(moduleId, permissions);
    }

    // Convert to flat format if requested
    if (format === NavigationFormat.FLAT) {
      return this.convertTreeToFlat(tree);
    }

    return tree;
  }

  /**
   * Preview navigation as a specific role (admin only)
   * @param roleCode Role code to preview as
   * @param scope Navigation scope
   * @param moduleId Module identifier (for module scope)
   * @param format Response format
   * @returns Navigation items as they would appear for the role
   */
  async previewNavigationAsRole(
    roleCode: string,
    scope: NavigationScope,
    moduleId?: string,
    format: NavigationFormat = NavigationFormat.TREE,
  ): Promise<NavigationItemDto[]> {
    // Get permissions for the role
    const permissions = await this.getRolePermissions(roleCode);

    // Get navigation based on scope
    let tree: NavigationItemDto[];
    if (scope === NavigationScope.GLOBAL) {
      tree = await this.getGlobalNavigation(permissions);
    } else {
      if (!moduleId) {
        throw new BadRequestException(
          'moduleId is required when scope is module',
        );
      }
      tree = await this.getModuleNavigation(moduleId, permissions);
    }

    // Convert to flat format if requested
    if (format === NavigationFormat.FLAT) {
      return this.convertTreeToFlat(tree);
    }

    return tree;
  }

  /**
   * Convert navigation tree to flat format
   * @param tree Navigation tree
   * @returns Flat array of navigation items
   */
  convertTreeToFlat(tree: NavigationItemDto[]): NavigationItemDto[] {
    const flat: NavigationItemDto[] = [];

    const flatten = (items: NavigationItemDto[], parentId?: string) => {
      for (const item of items) {
        const children = item.items || [];
        const flatItem = { ...item };

        // Remove items array and set parentId
        delete flatItem.items;
        if (parentId) {
          flatItem.parentId = parentId;
        }

        flat.push(flatItem);

        // Recursively flatten children
        if (children.length > 0) {
          flatten(children, item.id);
        }
      }
    };

    flatten(tree);
    return flat;
  }

  /**
   * Get user permissions from authorization service
   * @param userId User ID
   * @returns Array of permission strings
   */
  private async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Get effective permissions from authorization service
      // Use 'organization' scope to include both global and tenant permissions
      const permissions =
        await this.authorizationService.getEffectivePermissions(
          userId,
          'organization', // PermissionScope constant
        );

      this.logger.debug(
        `Retrieved ${permissions.length} permissions for user ${userId}`,
      );
      return permissions;
    } catch (error) {
      this.logger.error(
        `Error getting permissions for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Return empty array on error to fail gracefully
      return [];
    }
  }

  /**
   * Get permissions for a specific role
   * @param roleCode Role code
   * @returns Array of permission strings
   */
  private async getRolePermissions(roleCode: string): Promise<string[]> {
    try {
      // Look up role by code
      const role = await this.roleModel
        .findOne({ code: roleCode, status: 'active' })
        .exec();

      if (!role) {
        this.logger.warn(`Role '${roleCode}' not found or inactive`);
        return [];
      }

      this.logger.debug(
        `Retrieved ${role.permissions.length} permissions for role ${roleCode}`,
      );
      return role.permissions;
    } catch (error) {
      this.logger.error(
        `Error getting permissions for role ${roleCode}: ${error.message}`,
        error.stack,
      );
      // Return empty array on error to fail gracefully
      return [];
    }
  }

  /**
   * Reload/invalidate navigation cache
   */
  async reloadCache(scope?: NavigationScope, moduleId?: string): Promise<void> {
    this.invalidateCache(scope, moduleId);
    this.logger.log(
      `Navigation cache invalidated for scope=${scope}, moduleId=${moduleId}`,
    );
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Build navigation tree recursively with permission filtering
   */
  private async buildNavigationTree(
    items: Navigation[],
    permissions?: string[],
  ): Promise<NavigationItemDto[]> {
    const result: NavigationItemDto[] = [];

    for (const item of items) {
      // Filter by permissions if provided
      if (permissions && !this.hasPermission(item, permissions)) {
        continue;
      }

      const dto = this.mapToDto(item);

      // Load children recursively
      const children = await this.navigationRepository.findChildren(item.id);
      if (children.length > 0) {
        dto.items = await this.buildNavigationTree(children, permissions);
      }

      result.push(dto);
    }

    return result;
  }

  /**
   * Check if user has permission to access navigation item
   */
  private hasPermission(item: Navigation, userPermissions: string[]): boolean {
    if (!item.permissions) {
      return true; // No permission requirement
    }

    // Check exclude list first
    if (item.permissions.exclude && item.permissions.exclude.length > 0) {
      const hasExcluded = item.permissions.exclude.some((perm) =>
        userPermissions.includes(perm),
      );
      if (hasExcluded) {
        return false;
      }
    }

    // Check include list
    if (item.permissions.include && item.permissions.include.length > 0) {
      const hasRequired = item.permissions.include.some((perm) =>
        userPermissions.includes(perm),
      );
      return hasRequired;
    }

    return true;
  }

  /**
   * Validate parent change to prevent cycles
   */
  private async validateParentChange(
    id: string,
    newParentId: string | null | undefined,
    current: Navigation,
  ): Promise<void> {
    if (!newParentId) {
      return; // Moving to root level is always valid
    }

    if (newParentId === id) {
      throw new BadRequestException('Navigation item cannot be its own parent');
    }

    const newParent = await this.navigationRepository.findById(newParentId);
    if (!newParent) {
      throw new NotFoundException(
        `Parent navigation item '${newParentId}' not found`,
      );
    }

    // Check scope compatibility
    // Allow Module -> Global parenting, but not Global -> Module
    if (
      current.scope === NavigationScope.GLOBAL &&
      newParent.scope === NavigationScope.MODULE
    ) {
      throw new BadRequestException(
        'Global navigation item cannot have a module navigation item as parent',
      );
    }
    // If scopes match, checking module ID
    if (
      current.scope === NavigationScope.MODULE &&
      newParent.scope === NavigationScope.MODULE &&
      current.moduleId !== newParent.moduleId
    ) {
      throw new BadRequestException(
        'Navigation item module must match parent module',
      );
    }
    // Note: We allow current(Module) -> parent(Global)

    // Check for cycles
    const ancestors = await this.navigationRepository.getAncestors(newParentId);
    if (ancestors.includes(id)) {
      throw new BadRequestException(
        'Cannot set parent: would create a circular reference in navigation hierarchy',
      );
    }
  }

  /**
   * Sanitize navigation data to prevent XSS
   */
  private sanitizeNavigationData(
    dto: CreateNavigationDto | UpdateNavigationDto,
  ): void {
    // Basic XSS prevention: remove script tags and dangerous attributes
    const dangerousPattern = /<script|javascript:|onerror=|onload=/gi;

    if ('label' in dto && dto.label) {
      if (dangerousPattern.test(dto.label)) {
        throw new BadRequestException(
          'Label contains potentially dangerous content',
        );
      }
    }

    if ('tooltip' in dto && dto.tooltip) {
      if (dangerousPattern.test(dto.tooltip)) {
        throw new BadRequestException(
          'Tooltip contains potentially dangerous content',
        );
      }
    }

    if ('subtitle' in dto && dto.subtitle) {
      if (dangerousPattern.test(dto.subtitle)) {
        throw new BadRequestException(
          'Subtitle contains potentially dangerous content',
        );
      }
    }

    // Validate routerLink format
    if ('routerLink' in dto && dto.routerLink) {
      if (!dto.routerLink.startsWith('/') && !dto.routerLink.startsWith('./')) {
        throw new BadRequestException('RouterLink must start with / or ./');
      }
    }
  }

  /**
   * Map Navigation entity to DTO
   */
  private mapToDto(navigation: Navigation): NavigationItemDto {
    // Log warning if timestamps are missing
    if (!navigation.createdAt || !navigation.updatedAt) {
      this.logger.warn(
        `Navigation item '${navigation.id}' is missing timestamps. ` +
          `createdAt: ${navigation.createdAt}, updatedAt: ${navigation.updatedAt}`,
      );
    }

    return {
      id: navigation.id,
      label: navigation.label,
      icon: navigation.icon,
      subtitle: navigation.subtitle,
      routerLink: navigation.routerLink,
      url: navigation.url,
      permissions: navigation.permissions,
      command: navigation.command,
      disabled: navigation.disabled,
      target: navigation.target,
      badge: navigation.badge,
      tooltip: navigation.tooltip,
      shortcut: navigation.shortcut,
      class: navigation.class,
      iconStyle: navigation.iconStyle,
      iconClass: navigation.iconClass,
      labelStyle: navigation.labelStyle,
      labelClass: navigation.labelClass,
      linkStyle: navigation.linkStyle,
      linkClass: navigation.linkClass,
      order: navigation.order,
      scope: navigation.scope,
      moduleId: navigation.moduleId,
      parentId: navigation.parentId,
      meta: navigation.meta,
      createdBy: navigation.createdBy,
      updatedBy: navigation.updatedBy,
      createdAt: navigation.createdAt || new Date(),
      updatedAt: navigation.updatedAt || new Date(),
      items: [],
    };
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): NavigationItemDto[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: NavigationItemDto[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache entries
   */
  private invalidateCache(scope?: NavigationScope, moduleId?: string): void {
    if (!scope) {
      // Clear all cache
      this.cache.clear();
      return;
    }

    // Clear specific scope/module cache
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (scope === NavigationScope.GLOBAL && key.startsWith('global:')) {
        keysToDelete.push(key);
      } else if (
        scope === NavigationScope.MODULE &&
        moduleId &&
        key.startsWith(`module:${moduleId}:`)
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Publish navigation event
   */
  private async publishEvent(
    eventName: string,
    navigation: Navigation,
    userId: string,
  ): Promise<void> {
    try {
      this.userClient.emit(eventName, {
        id: navigation.id,
        scope: navigation.scope,
        moduleId: navigation.moduleId,
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Error publishing event ${eventName}: ${error.message}`,
        error.stack,
      );
      // Don't throw - event publishing failure shouldn't break the operation
    }
  }
}
