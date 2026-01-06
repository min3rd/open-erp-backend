import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EVENT_NAMES } from '@shared/constants/message.constants';
import { UserRepository } from './repositories/user.repository';

/**
 * UserEventController handles incoming events from other services
 * Uses @EventPattern decorators for NestJS microservice pattern
 */
@Controller()
export class UserEventController {
  private readonly logger = new Logger(UserEventController.name);

  constructor(private readonly userRepository: UserRepository) {}

  @EventPattern(EVENT_NAMES.AUTH.USER_REGISTERED)
  async handleUserRegistered(
    @Payload() data: { username: string; email: string },
  ) {
    this.logger.log(
      `Event: ${EVENT_NAMES.AUTH.USER_REGISTERED} - ${JSON.stringify(data)}`,
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

  @EventPattern(EVENT_NAMES.AUTH.USER_LOGIN)
  async handleUserLogin(@Payload() data: { userId: string }) {
    this.logger.log(`Event: ${EVENT_NAMES.AUTH.USER_LOGIN} - ${data.userId}`);
    if (data.userId) {
      try {
        await this.userRepository.updateLastLogin(data.userId);
      } catch (error) {
        this.logger.error(`Error updating last login: ${error.message}`);
      }
    }
  }
}
