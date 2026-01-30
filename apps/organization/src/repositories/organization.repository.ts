import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
  OrganizationType,
  OrganizationStatus,
} from '@shared/schemas';

export interface CreateOrganizationDto {
  type: OrganizationType;
  name: string;
  internationalName?: string;
  taxId: string;
  headquartersAddress: string;
  legalRepresentative: string;
  contactPhone: string;
  contactEmail: string;
  foundedDate: Date;
  status?: OrganizationStatus;
  country?: string;
  description?: string;
  website?: string;
  metadata?: Map<string, any>;
  createdBy: Types.ObjectId;
}

export interface UpdateOrganizationDto {
  name?: string;
  internationalName?: string;
  taxId?: string;
  headquartersAddress?: string;
  legalRepresentative?: string;
  contactPhone?: string;
  contactEmail?: string;
  foundedDate?: Date;
  status?: OrganizationStatus;
  country?: string;
  description?: string;
  website?: string;
  metadata?: Map<string, any>;
  updatedBy?: Types.ObjectId;
}

@Injectable()
export class OrganizationRepository {
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
  ) {}

  async create(
    createDto: CreateOrganizationDto,
  ): Promise<OrganizationDocument> {
    try {
      const organization = new this.organizationModel(createDto);
      return await organization.save();
    } catch (error) {
      this.logger.error(
        `Error creating organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding organization by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    filters: {
      type?: OrganizationType;
      status?: OrganizationStatus;
      country?: string;
      createdBy?: string;
    } = {},
  ): Promise<OrganizationDocument[]> {
    try {
      const query: any = {};
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.country) query.country = filters.country;
      if (filters.createdBy) query.createdBy = filters.createdBy;

      return await this.organizationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding organizations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByTaxId(
    taxId: string,
    country: string,
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel.findOne({ taxId, country }).exec();
    } catch (error) {
      this.logger.error(
        `Error finding organization by taxId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<OrganizationDocument | null> {
    try {
      return await this.organizationModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error updating organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async softDelete(
    id: string,
    deletedBy: Types.ObjectId,
  ): Promise<OrganizationDocument | null> {
    try {
      const organization = await this.organizationModel.findById(id).exec();
      if (!organization) {
        return null;
      }
      organization.deletedAt = new Date();
      organization.updatedBy = deletedBy as any;
      await organization.save();
      return organization;
    } catch (error) {
      this.logger.error(
        `Error soft deleting organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async restore(id: string): Promise<OrganizationDocument | null> {
    try {
      const organization = await this.organizationModel
        .findById(id)
        .setOptions({ includeDeleted: true } as any)
        .exec();
      if (!organization) {
        return null;
      }
      organization.deletedAt = null as any;
      await organization.save();
      return organization;
    } catch (error) {
      this.logger.error(
        `Error restoring organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async search(query: string): Promise<OrganizationDocument[]> {
    try {
      return await this.organizationModel
        .find({
          $text: { $search: query },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error searching organizations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async count(
    filters: {
      type?: OrganizationType;
      status?: OrganizationStatus;
    } = {},
  ): Promise<number> {
    try {
      const query: any = {};
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;

      return await this.organizationModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting organizations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * List organizations with pagination, search, and sorting
   */
  async listWithPagination(options: {
    q?: string;
    page?: number;
    limit?: number;
    sort?: { field: string; order: 'asc' | 'desc' };
    type?: OrganizationType;
    status?: OrganizationStatus;
  }): Promise<{
    items: OrganizationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { q, page = 1, limit = 50, sort, type, status } = options;

      const query: any = {};
      if (type) query.type = type;
      if (status) query.status = status;

      // Text search or regex search
      if (q) {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { taxId: { $regex: q, $options: 'i' } },
          { internationalName: { $regex: q, $options: 'i' } },
        ];
      }

      const sortOption: any = {};
      if (sort) {
        sortOption[sort.field] = sort.order === 'asc' ? 1 : -1;
      } else {
        sortOption.createdAt = -1;
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        this.organizationModel
          .find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.organizationModel.countDocuments(query).exec(),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Error listing organizations with pagination: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
