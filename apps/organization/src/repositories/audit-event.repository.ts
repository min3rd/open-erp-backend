import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrganizationAuditEvent,
  OrganizationAuditEventDocument,
  AuditEventType,
} from '@shared/schemas';

export interface CreateAuditEventDto {
  eventType: AuditEventType;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  eventData: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Map<string, any>;
}

@Injectable()
export class AuditEventRepository {
  private readonly logger = new Logger(AuditEventRepository.name);

  constructor(
    @InjectModel(OrganizationAuditEvent.name)
    private auditEventModel: Model<OrganizationAuditEventDocument>,
  ) {}

  async create(
    createDto: CreateAuditEventDto,
  ): Promise<OrganizationAuditEventDocument> {
    try {
      const auditEvent = new this.auditEventModel(createDto);
      return await auditEvent.save();
    } catch (error) {
      this.logger.error(
        `Error creating audit event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationAuditEventDocument | null> {
    try {
      return await this.auditEventModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding audit event by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: string,
    options: {
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<OrganizationAuditEventDocument[]> {
    try {
      const query: any = { organizationId: new Types.ObjectId(organizationId) };

      if (options.eventType) {
        query.eventType = options.eventType;
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

      let queryBuilder = this.auditEventModel
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
        `Error finding audit events by organizationId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    options: {
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<OrganizationAuditEventDocument[]> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) };

      if (options.eventType) {
        query.eventType = options.eventType;
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

      let queryBuilder = this.auditEventModel
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
        `Error finding audit events by userId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEventType(
    eventType: AuditEventType,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<OrganizationAuditEventDocument[]> {
    try {
      const query: any = { eventType };

      if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) {
          query.createdAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.createdAt.$lte = options.endDate;
        }
      }

      let queryBuilder = this.auditEventModel
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
        `Error finding audit events by eventType: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async count(
    organizationId: string,
    options: {
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<number> {
    try {
      const query: any = { organizationId: new Types.ObjectId(organizationId) };

      if (options.eventType) {
        query.eventType = options.eventType;
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

      return await this.auditEventModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting audit events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
