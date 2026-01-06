import { Controller, Logger } from '@nestjs/common';
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { UserRepository } from './repositories/user.repository';
import { EventMessage } from '@shared/types/rabbitmq.types';

/**
 * UserEventController handles incoming events from other services
 * Methods are registered with the custom RabbitMQ client
 */
@Controller()
export class UserEventController {
  private readonly logger = new Logger(UserEventController.name);

  constructor(private readonly userRepository: UserRepository) {}

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

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  private async handleUserRegistered(data: { username: string; email: string }) {
    this.logger.log(
      `Handling ${EVENT_NAMES.AUTH.USER_REGISTERED} - ${JSON.stringify(data)}`,
    );
    // Handle user registration from auth service
    if (data.username && data.email) {
      try {
        await this.userRepository.create({
          username: data.username,
          email: data.email,
        });
      } catch (error) {
        this.logger.error(`Error creating user from event: ${error.message}`);
      }
    }
  }

  private async handleUserLogin(data: { userId: string }) {
    this.logger.log(`Handling ${EVENT_NAMES.AUTH.USER_LOGIN} - ${data.userId}`);
    if (data.userId) {
      try {
        await this.userRepository.updateLastLogin(data.userId);
      } catch (error) {
        this.logger.error(`Error updating last login: ${error.message}`);
      }
    }
  }
}
