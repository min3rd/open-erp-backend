import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  UserAuditEventRepository,
  CreateUserAuditEventDto,
  FindUserAuditEventsOptions,
} from '../repositories/user-audit-event.repository';
import { UserAuditEventType } from '@shared/schemas';

@Injectable()
export class UserAuditService {
  private readonly logger = new Logger(UserAuditService.name);

  constructor(
    private readonly userAuditEventRepository: UserAuditEventRepository,
  ) {}

  /**
   * Log a user audit event
   */
  async logEvent(
    action: UserAuditEventType,
    userId: string,
    resource: string,
    options?: {
      performedBy?: string;
      payload?: any;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      status?: string;
      metadata?: Map<string, any>;
    },
  ): Promise<void> {
    try {
      const createDto: CreateUserAuditEventDto = {
        action,
        userId: new Types.ObjectId(userId),
        resource,
        performedBy: options?.performedBy
          ? new Types.ObjectId(options.performedBy)
          : undefined,
        payload: options?.payload,
        description: options?.description,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        status: options?.status || 'success',
        metadata: options?.metadata,
      };

      await this.userAuditEventRepository.create(createDto);
    } catch (error) {
      // Log but don't throw - audit failures shouldn't break business logic
      this.logger.error(
        `Failed to log user audit event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(
    userId: string,
    options: FindUserAuditEventsOptions = {},
  ) {
    return this.userAuditEventRepository.findByUserId(userId, options);
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string) {
    return this.userAuditEventRepository.findById(id);
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(
    action: UserAuditEventType,
    options: FindUserAuditEventsOptions = {},
  ) {
    return this.userAuditEventRepository.findByAction(action, options);
  }

  /**
   * Count user audit logs
   */
  async countUserAuditLogs(
    userId: string,
    options: FindUserAuditEventsOptions = {},
  ) {
    return this.userAuditEventRepository.count(userId, options);
  }
}
