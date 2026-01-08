import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '@shared/schemas/role.schema';

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  scope: 'global' | 'organization';
  organizationId?: Types.ObjectId | string;
  permissions: string[];
  status?: string;
  isSystem?: boolean;
}

@Injectable()
export class RoleRepository {
  private readonly logger = new Logger(RoleRepository.name);

  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const role = new this.roleModel(createRoleDto);
      return await role.save();
    } catch (error) {
      this.logger.error(`Error creating role: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByCode(
    code: string,
    scope: 'global' | 'organization' = 'global',
    organizationId?: string,
  ): Promise<Role | null> {
    try {
      const query: any = { code, scope };
      if (scope === 'organization' && organizationId) {
        query.organizationId = new Types.ObjectId(organizationId);
      } else if (scope === 'global') {
        query.organizationId = null;
      }
      return await this.roleModel.findOne(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding role by code: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<Role | null> {
    try {
      return await this.roleModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding role by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    filter: {
      scope?: 'global' | 'organization';
      organizationId?: string;
      status?: string;
    } = {},
  ): Promise<Role[]> {
    try {
      const query: any = {};
      if (filter.scope) {
        query.scope = filter.scope;
      }
      if (filter.organizationId) {
        query.organizationId = new Types.ObjectId(filter.organizationId);
      }
      if (filter.status) {
        query.status = filter.status;
      }
      return await this.roleModel.find(query).exec();
    } catch (error) {
      this.logger.error(`Error finding roles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ensure a system role exists, create it if not
   */
  async ensureSystemRoleExists(
    code: string,
    data: Partial<CreateRoleDto>,
  ): Promise<Role> {
    try {
      let role = await this.findByCode(code, 'global');
      if (!role) {
        this.logger.log(`Creating system role: ${code}`);
        role = await this.create({
          code,
          name: data.name || code,
          description: data.description || `System role: ${code}`,
          scope: 'global',
          permissions: data.permissions || [],
          status: 'active',
          isSystem: true,
        });
        this.logger.log(`System role created: ${code} (${role._id})`);
      }
      return role;
    } catch (error) {
      this.logger.error(
        `Error ensuring system role exists: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateData: Partial<CreateRoleDto>,
  ): Promise<Role | null> {
    try {
      return await this.roleModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating role: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<Role | null> {
    try {
      const role = await this.roleModel.findById(id).exec();
      if (!role) {
        return null;
      }
      // Soft delete
      role.deletedAt = new Date();
      role.status = 'inactive';
      await role.save();
      return role;
    } catch (error) {
      this.logger.error(
        `Error soft deleting role: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
