import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EVENT_NAMES } from '@shared/constants/message.constants';

/**
 * NotificationEventController handles incoming events from other services
 * Uses @EventPattern decorators for NestJS microservice pattern
 */
@Controller()
export class NotificationEventController {
  private readonly logger = new Logger(NotificationEventController.name);

  @EventPattern(EVENT_NAMES.AUTH.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: { email: string }) {
    this.logger.log(
      `Event: ${EVENT_NAMES.AUTH.USER_REGISTERED} - ${data.email}`,
    );
    // Send welcome email when user registers (different from verification email)
    // Note: This is different from verification email, can be implemented later
  }

  @EventPattern(EVENT_NAMES.AUTH.USER_LOGIN)
  async handleUserLogin(@Payload() data: { userId: string }) {
    this.logger.log(`Event: ${EVENT_NAMES.AUTH.USER_LOGIN} - ${data.userId}`);
    // Could send notification about login activity
  }

  @EventPattern(EVENT_NAMES.USER.CREATED)
  async handleUserCreated(@Payload() data: { id: string }) {
    this.logger.log(`Event: ${EVENT_NAMES.USER.CREATED} - ${data.id}`);
  }

  @EventPattern(EVENT_NAMES.USER.UPDATED)
  async handleUserUpdated(@Payload() data: { userId: string }) {
    this.logger.log(`Event: ${EVENT_NAMES.USER.UPDATED} - ${data.userId}`);
  }

  @EventPattern(EVENT_NAMES.USER.DELETED)
  async handleUserDeleted(@Payload() data: { userId: string }) {
    this.logger.log(`Event: ${EVENT_NAMES.USER.DELETED} - ${data.userId}`);
  }
}
