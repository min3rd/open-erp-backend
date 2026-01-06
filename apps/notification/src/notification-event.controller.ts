import { Controller, Logger } from '@nestjs/common';
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { EventMessage } from '@shared/types/rabbitmq.types';

/**
 * NotificationEventController handles incoming events from other services
 * Methods are registered with the custom RabbitMQ client
 */
@Controller()
export class NotificationEventController {
  private readonly logger = new Logger(NotificationEventController.name);

  /**
   * Main event handler that routes messages to specific methods
   */
  async handleEvent(message: EventMessage<any>) {
    this.logger.log(`Event: ${message.eventName}`);

    switch (message.eventName) {
      case EVENT_NAMES.AUTH.USER_REGISTERED:
        await this.handleUserRegistered(message.data);
        break;

      case EVENT_NAMES.AUTH.USER_LOGIN:
        await this.handleUserLogin(message.data);
        break;

      case EVENT_NAMES.USER.CREATED:
        await this.handleUserCreated(message.data);
        break;

      case EVENT_NAMES.USER.UPDATED:
        await this.handleUserUpdated(message.data);
        break;

      case EVENT_NAMES.USER.DELETED:
        await this.handleUserDeleted(message.data);
        break;

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  private async handleUserRegistered(data: { email: string }) {
    this.logger.log(
      `Handling ${EVENT_NAMES.AUTH.USER_REGISTERED} - ${data.email}`,
    );
    // Send welcome email when user registers (different from verification email)
    // Note: This is different from verification email, can be implemented later
  }

  private async handleUserLogin(data: { userId: string }) {
    this.logger.log(
      `Handling ${EVENT_NAMES.AUTH.USER_LOGIN} - ${data.userId}`,
    );
    // Could send notification about login activity
  }

  private async handleUserCreated(data: { id: string }) {
    this.logger.log(`Handling ${EVENT_NAMES.USER.CREATED} - ${data.id}`);
  }

  private async handleUserUpdated(data: { userId: string }) {
    this.logger.log(`Handling ${EVENT_NAMES.USER.UPDATED} - ${data.userId}`);
  }

  private async handleUserDeleted(data: { userId: string }) {
    this.logger.log(`Handling ${EVENT_NAMES.USER.DELETED} - ${data.userId}`);
  }
}
