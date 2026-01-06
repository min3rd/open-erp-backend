import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrganizationRelation,
  OrganizationRelationDocument,
  RelationType,
  RelationStatus,
} from '@shared/schemas';

export interface CreateRelationDto {
  parentId: Types.ObjectId;
  childId: Types.ObjectId;
  relationType: RelationType;
  sharePercentage?: number;
  effectiveDate: Date;
  endDate?: Date;
  status?: RelationStatus;
  notes?: string;
  metadata?: Map<string, any>;
  createdBy: Types.ObjectId;
}

export interface UpdateRelationDto {
  relationType?: RelationType;
  sharePercentage?: number;
  effectiveDate?: Date;
  endDate?: Date;
  status?: RelationStatus;
  notes?: string;
  metadata?: Map<string, any>;
  updatedBy?: Types.ObjectId;
}

@Injectable()
export class OrganizationRelationRepository {
  private readonly logger = new Logger(OrganizationRelationRepository.name);

  constructor(
    @InjectModel(OrganizationRelation.name)
    private relationModel: Model<OrganizationRelationDocument>,
  ) {}

  async create(
    createDto: CreateRelationDto,
  ): Promise<OrganizationRelationDocument> {
    try {
      const relation = new this.relationModel(createDto);
      return await relation.save();
    } catch (error) {
      this.logger.error(
        `Error creating relation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationRelationDocument | null> {
    try {
      return await this.relationModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding relation by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByParentId(
    parentId: string,
    status?: RelationStatus,
  ): Promise<OrganizationRelationDocument[]> {
    try {
      const query: any = { parentId: parentId as any };
      if (status) query.status = status;

      return await this.relationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding relations by parentId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByChildId(
    childId: string,
    status?: RelationStatus,
  ): Promise<OrganizationRelationDocument[]> {
    try {
      const query: any = { childId: new Types.ObjectId(childId) };
      if (status) query.status = status;

      return await this.relationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding relations by childId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByParentAndChild(
    parentId: string,
    childId: string,
  ): Promise<OrganizationRelationDocument | null> {
    try {
      return await this.relationModel
        .findOne({
          parentId: parentId as any,
          childId: childId as any,
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding relation by parent and child: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdateRelationDto,
  ): Promise<OrganizationRelationDocument | null> {
    try {
      return await this.relationModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error updating relation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async softDelete(
    id: string,
    deletedBy: Types.ObjectId,
  ): Promise<OrganizationRelationDocument | null> {
    try {
      const relation = await this.relationModel.findById(id).exec();
      if (!relation) {
        return null;
      }
      relation.deletedAt = new Date();
      relation.updatedBy = deletedBy as any;
      await relation.save();
      return relation;
    } catch (error) {
      this.logger.error(
        `Error soft deleting relation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getDescendants(
    organizationId: string,
    maxDepth: number = 10,
  ): Promise<OrganizationRelationDocument[]> {
    try {
      const descendants: OrganizationRelationDocument[] = [];
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [
        { id: organizationId, depth: 0 },
      ];

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;

        if (visited.has(id) || depth >= maxDepth) {
          continue;
        }

        visited.add(id);

        const children = await this.findByParentId(id, RelationStatus.ACTIVE);
        descendants.push(...children);

        for (const child of children) {
          queue.push({
            id: child.childId.toString(),
            depth: depth + 1,
          });
        }
      }

      return descendants;
    } catch (error) {
      this.logger.error(
        `Error getting descendants: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAncestors(
    organizationId: string,
    maxDepth: number = 10,
  ): Promise<OrganizationRelationDocument[]> {
    try {
      const ancestors: OrganizationRelationDocument[] = [];
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [
        { id: organizationId, depth: 0 },
      ];

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;

        if (visited.has(id) || depth >= maxDepth) {
          continue;
        }

        visited.add(id);

        const parents = await this.findByChildId(id, RelationStatus.ACTIVE);
        ancestors.push(...parents);

        for (const parent of parents) {
          queue.push({
            id: parent.parentId.toString(),
            depth: depth + 1,
          });
        }
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
}
