import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AuditEventRepository,
  CreateAuditEventDto,
} from '../repositories/audit-event.repository';
import { AuditEventType } from '@shared/schemas';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditEventRepository: AuditEventRepository) {}

  async logEvent(
    eventType: AuditEventType,
    organizationId: string,
    userId: string,
    eventData: any,
    options?: {
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Map<string, any>;
    },
  ): Promise<void> {
    try {
      const createDto: CreateAuditEventDto = {
        eventType,
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
        eventData,
        description: options?.description,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        metadata: options?.metadata,
      };

      await this.auditEventRepository.create(createDto);
    } catch (error) {
      // Log but don't throw - audit failures shouldn't break business logic
      this.logger.error(
        `Failed to log audit event: ${error.message}`,
        error.stack,
      );
    }
  }

  async getOrganizationAuditLog(
    organizationId: string,
    options: {
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ) {
    return this.auditEventRepository.findByOrganizationId(
      organizationId,
      options,
    );
  }

  async getUserAuditLog(
    userId: string,
    options: {
      eventType?: AuditEventType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ) {
    return this.auditEventRepository.findByUserId(userId, options);
  }
}
