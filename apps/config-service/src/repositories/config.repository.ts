import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Config, ConfigDocument, ConfigScope } from '../schemas/config.schema';

export interface CreateConfigData {
  name: string;
  scope: ConfigScope;
  data: Record<string, any>;
  description?: string;
  ownerId?: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateConfigData {
  data?: Record<string, any>;
  description?: string;
  updatedBy: string;
}

@Injectable()
export class ConfigRepository {
  private readonly logger = new Logger(ConfigRepository.name);

  constructor(
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
  ) {}

  /**
   * Find a config by name and scope, optionally filtered by ownerId
   */
  async findOne(
    name: string,
    scope: ConfigScope,
    ownerId?: string,
  ): Promise<Config | null> {
    try {
      const query: any = { name, scope };
      if (scope === ConfigScope.USER && ownerId) {
        query.ownerId = ownerId;
      }
      return await this.configModel.findOne(query).exec();
    } catch (error) {
      this.logger.error(`Error finding config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all configs matching the criteria
   */
  async find(
    scope?: ConfigScope,
    ownerId?: string,
    limit: number = 100,
  ): Promise<Config[]> {
    try {
      const query: any = {};
      if (scope) query.scope = scope;
      if (ownerId) query.ownerId = ownerId;

      return await this.configModel
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error finding configs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new config
   */
  async create(createData: CreateConfigData): Promise<Config> {
    try {
      const config = new this.configModel({
        ...createData,
        version: 1,
      });
      return await config.save();
    } catch (error) {
      this.logger.error(`Error creating config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update existing config with version increment
   */
  async update(
    name: string,
    scope: ConfigScope,
    updateData: UpdateConfigData,
    ownerId?: string,
  ): Promise<Config | null> {
    try {
      const query: any = { name, scope };
      if (scope === ConfigScope.USER && ownerId) {
        query.ownerId = ownerId;
      }

      const updateFields: any = {
        updatedBy: updateData.updatedBy,
        $inc: { version: 1 },
      };

      if (updateData.data !== undefined) {
        updateFields.data = updateData.data;
      }
      if (updateData.description !== undefined) {
        updateFields.description = updateData.description;
      }

      return await this.configModel
        .findOneAndUpdate(query, updateFields, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upsert (create or update) a config
   */
  async upsert(
    name: string,
    scope: ConfigScope,
    data: Record<string, any>,
    userId: string,
    ownerId?: string,
    description?: string,
  ): Promise<Config> {
    try {
      const existing = await this.findOne(name, scope, ownerId);

      if (existing) {
        const updated = await this.update(
          name,
          scope,
          { data, description, updatedBy: userId },
          ownerId,
        );
        return updated!;
      } else {
        return await this.create({
          name,
          scope,
          data,
          description,
          ownerId,
          createdBy: userId,
          updatedBy: userId,
        });
      }
    } catch (error) {
      this.logger.error(`Error upserting config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a config
   */
  async delete(
    name: string,
    scope: ConfigScope,
    ownerId?: string,
  ): Promise<boolean> {
    try {
      const query: any = { name, scope };
      if (scope === ConfigScope.USER && ownerId) {
        query.ownerId = ownerId;
      }

      const result = await this.configModel.findOneAndDelete(query).exec();
      return !!result;
    } catch (error) {
      this.logger.error(`Error deleting config: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Count configs matching criteria
   */
  async count(scope?: ConfigScope, ownerId?: string): Promise<number> {
    try {
      const query: any = {};
      if (scope) query.scope = scope;
      if (ownerId) query.ownerId = ownerId;

      return await this.configModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(`Error counting configs: ${error.message}`, error.stack);
      throw error;
    }
  }
}
