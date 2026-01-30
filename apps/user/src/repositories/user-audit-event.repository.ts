import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserAuditEvent,
  UserAuditEventDocument,
  UserAuditEventType,
} from '@shared/schemas';

export interface CreateUserAuditEventDto {
  action: UserAuditEventType;
  userId: Types.ObjectId;
  performedBy?: Types.ObjectId;
  resource: string;
  payload?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: string;
  metadata?: Map<string, any>;
}

export interface FindUserAuditEventsOptions {
  action?: UserAuditEventType;
  resource?: string;
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  sortBy?: string;
}

@Injectable()
export class UserAuditEventRepository {
  private readonly logger = new Logger(UserAuditEventRepository.name);

  constructor(
    @InjectModel(UserAuditEvent.name)
    private userAuditEventModel: Model<UserAuditEventDocument>,
  ) {}

  async create(
    createDto: CreateUserAuditEventDto,
  ): Promise<UserAuditEventDocument> {
    try {
      const auditEvent = new this.userAuditEventModel(createDto);
      return await auditEvent.save();
    } catch (error) {
      this.logger.error(
        `Error creating user audit event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<UserAuditEventDocument | null> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      return await this.userAuditEventModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding user audit event by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    options: FindUserAuditEventsOptions = {},
  ): Promise<{ items: UserAuditEventDocument[]; total: number }> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) };

      // Filter by action
      if (options.action) {
        query.action = options.action;
      }

      // Filter by resource (exact match to avoid regex DoS)
      if (options.resource) {
        query.resource = options.resource;
      }

      // Filter by status
      if (options.status) {
        query.status = options.status;
      }

      // Text search on action, resource, and description
      // Note: When using text search with sorting, we sort by the specified field
      // rather than text relevance score. This provides more predictable ordering
      // for users but means results aren't sorted by search relevance.
      // Text search will still filter results appropriately.
      if (options.search) {
        query.$text = { $search: options.search };
      }

      // Date range filtering
      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      // Parse sortBy (e.g., "createdAt:desc" or "action:asc")
      let sort: any = { createdAt: -1 }; // default sort
      if (options.sortBy) {
        const parts = options.sortBy.split(':');
        if (parts.length === 2) {
          const [field, order] = parts;
          // Validate field and order
          const allowedFields = ['createdAt', 'action', 'status'];
          if (allowedFields.includes(field) && ['asc', 'desc'].includes(order)) {
            sort = { [field]: order === 'asc' ? 1 : -1 };
          }
        }
        // If invalid format, keep default sort
      }

      // Get total count
      const total = await this.userAuditEventModel.countDocuments(query).exec();

      // Build query with pagination
      let queryBuilder = this.userAuditEventModel.find(query).sort(sort);

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
      }

      const items = await queryBuilder.exec();

      return { items, total };
    } catch (error) {
      this.logger.error(
        `Error finding user audit events by userId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByAction(
    action: UserAuditEventType,
    options: FindUserAuditEventsOptions = {},
  ): Promise<UserAuditEventDocument[]> {
    try {
      const query: any = { action };

      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      let queryBuilder = this.userAuditEventModel
        .find(query)
        .sort({ createdAt: -1 });

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options.skip) {
        queryBuilder = queryBuilder.skip(options.skip);
      }

      return await queryBuilder.exec();
    } catch (error) {
      this.logger.error(
        `Error finding user audit events by action: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async count(
    userId: string,
    options: FindUserAuditEventsOptions = {},
  ): Promise<number> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) };

      if (options.action) {
        query.action = options.action;
      }

      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      return await this.userAuditEventModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting user audit events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
