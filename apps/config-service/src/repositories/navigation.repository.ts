import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Navigation,
  NavigationDocument,
  NavigationScope,
} from '../schemas/navigation.schema';
import { CreateNavigationDto } from '../dto/create-navigation.dto';
import { UpdateNavigationDto } from '../dto/update-navigation.dto';

@Injectable()
export class NavigationRepository {
  private readonly logger = new Logger(NavigationRepository.name);

  constructor(
    @InjectModel(Navigation.name)
    private navigationModel: Model<NavigationDocument>,
  ) {}

  /**
   * Find a navigation item by ID
   */
  async findById(id: string): Promise<Navigation | null> {
    try {
      return await this.navigationModel.findOne({ id }).exec();
    } catch (error) {
      this.logger.error(
        `Error finding navigation by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find all navigation items by scope and optional module
   */
  async findByScope(
    scope: NavigationScope,
    module?: string,
  ): Promise<Navigation[]> {
    try {
      const query: any = { scope };
      if (module) {
        query.module = module;
      }
      return await this.navigationModel
        .find(query)
        .sort({ order: 1, createdAt: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding navigation by scope: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find children of a navigation item
   */
  async findChildren(parentId: string): Promise<Navigation[]> {
    try {
      return await this.navigationModel
        .find({ parentId })
        .sort({ order: 1, createdAt: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding navigation children: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find root navigation items (no parent)
   */
  async findRoots(
    scope: NavigationScope,
    module?: string,
  ): Promise<Navigation[]> {
    try {
      const query: any = {
        scope,
        $or: [{ parentId: null }, { parentId: { $exists: false } }],
      };
      if (module) {
        query.module = module;
      }
      return await this.navigationModel
        .find(query)
        .sort({ order: 1, createdAt: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding root navigation items: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new navigation item
   */
  async create(dto: CreateNavigationDto, userId: string): Promise<Navigation> {
    try {
      const navigation = new this.navigationModel({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
      return await navigation.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(
          `Navigation item with ID '${dto.id}' already exists`,
        );
      }
      this.logger.error(
        `Error creating navigation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update a navigation item
   */
  async update(
    id: string,
    dto: UpdateNavigationDto,
    userId: string,
  ): Promise<Navigation | null> {
    try {
      return await this.navigationModel
        .findOneAndUpdate({ id }, { ...dto, updatedBy: userId }, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error updating navigation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a navigation item
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.navigationModel.deleteOne({ id }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(
        `Error deleting navigation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete all children of a navigation item recursively
   */
  async deleteChildren(parentId: string): Promise<number> {
    try {
      const children = await this.findChildren(parentId);
      let deletedCount = 0;

      for (const child of children) {
        // Recursively delete children's children
        deletedCount += await this.deleteChildren(child.id);
        // Delete the child
        const result = await this.navigationModel
          .deleteOne({ id: child.id })
          .exec();
        if (result.deletedCount > 0) {
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Error deleting navigation children: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Search navigation items by label, icon, or command
   */
  async search(query: string, limit: number = 50): Promise<Navigation[]> {
    try {
      const searchRegex = new RegExp(query, 'i');
      return await this.navigationModel
        .find({
          $or: [
            { label: searchRegex },
            { icon: searchRegex },
            { command: searchRegex },
            { subtitle: searchRegex },
          ],
        })
        .limit(limit)
        .sort({ order: 1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error searching navigation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all ancestors of a navigation item (for cycle detection)
   */
  async getAncestors(id: string): Promise<string[]> {
    try {
      const ancestors: string[] = [];
      let current = await this.findById(id);

      while (current?.parentId) {
        if (ancestors.includes(current.parentId)) {
          // Cycle detected
          throw new BadRequestException(
            'Circular reference detected in navigation hierarchy',
          );
        }
        ancestors.push(current.parentId);
        current = await this.findById(current.parentId);
      }

      return ancestors;
    } catch (error) {
      this.logger.error(
        `Error getting ancestors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Count navigation items by scope
   */
  async count(scope?: NavigationScope, module?: string): Promise<number> {
    try {
      const query: any = {};
      if (scope) query.scope = scope;
      if (module) query.module = module;
      return await this.navigationModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting navigation items: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
