import { Injectable, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import { EventMessage, RPCMessage } from '@shared/types/rabbitmq.types';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { EVENT_NAMES, RPC_METHODS } from '@shared/constants/message.constants';
import { UserRepository, UpdateUserDto } from './repositories/user.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly userRepository: UserRepository,
  ) {}

  async findAll() {
    try {
      const users = await this.userRepository.findAll();
      return {
        success: true,
        users,
      };
    } catch (error) {
      this.logger.error(
        `Error finding all users: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      return { success: true, user };
    } catch (error) {
      this.logger.error(`Error finding user: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  async create(data: { username: string; email: string }) {
    try {
      const user = await this.userRepository.create({
        username: data.username,
        email: data.email,
      });

      // Publish user created event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.USER_CREATED,
        EVENT_NAMES.USER.CREATED,
        user,
      );

      return { success: true, user };
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  async update(id: string, data: any) {
    try {
      const user = await this.userRepository.update(id, data);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Publish user updated event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.USER_UPDATED,
        EVENT_NAMES.USER.UPDATED,
        { userId: id, changes: data },
      );

      return { success: true, user };
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  async delete(id: string) {
    try {
      const user = await this.userRepository.delete(id);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Publish user deleted event
      await this.rabbitMQClient.publishEvent(
        RABBITMQ_EXCHANGES.EVENTS,
        RABBITMQ_ROUTING_KEYS.USER_DELETED,
        EVENT_NAMES.USER.DELETED,
        { userId: id },
      );

      return { success: true, message: 'User deleted' };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Handle incoming events from other services
   * @deprecated Use UserEventController with @EventPattern decorators instead
   */
  async handleEvent(message: EventMessage<any>) {
    this.logger.log(`Received event: ${message.eventName}`);

    switch (message.eventName) {
      case EVENT_NAMES.AUTH.USER_REGISTERED:
        // Handle user registration from auth service
        this.logger.log(`New user registered: ${JSON.stringify(message.data)}`);
        // Store user data
        if (message.data.username && message.data.email) {
          try {
            await this.userRepository.create({
              username: message.data.username,
              email: message.data.email,
            });
          } catch (error) {
            this.logger.error(
              `Error creating user from event: ${error.message}`,
            );
          }
        }
        break;

      case EVENT_NAMES.AUTH.USER_LOGIN:
        this.logger.log(`User logged in: ${message.data.userId}`);
        if (message.data.userId) {
          try {
            await this.userRepository.updateLastLogin(message.data.userId);
          } catch (error) {
            this.logger.error(`Error updating last login: ${error.message}`);
          }
        }
        break;

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  /**
   * Handle RPC requests
   * @deprecated Use UserRpcController with @MessagePattern decorators instead
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`Received RPC: ${message.method}`);

    switch (message.method) {
      case RPC_METHODS.USER.GET_USER:
        return await this.userRepository.findById(message.params.userId);

      case RPC_METHODS.USER.GET_USER_BY_EMAIL:
      case RPC_METHODS.USER.FIND_USER_BY_EMAIL:
        return await this.userRepository.findByEmail(
          message.params.email,
          message.params.includePassword,
        );

      case RPC_METHODS.USER.FIND_USER_BY_ID:
        return await this.userRepository.findById(message.params.userId);

      case RPC_METHODS.USER.CREATE_USER:
        try {
          const user = await this.userRepository.create(message.params);
          await this.rabbitMQClient.publishEvent(
            RABBITMQ_EXCHANGES.EVENTS,
            RABBITMQ_ROUTING_KEYS.USER_CREATED,
            EVENT_NAMES.USER.CREATED,
            user,
          );
          return user;
        } catch (error) {
          this.logger.error(
            `Error creating user via RPC: ${error.message}`,
            error.stack,
          );
          throw error;
        }

      case RPC_METHODS.USER.UPDATE_USER_STATUS:
        try {
          const { email, status, verifiedAt } = message.params;
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            throw new Error(`User not found with email: ${email}`);
          }

          const updateData: Partial<UpdateUserDto> = {
            status,
            ...(verifiedAt && { verifiedAt }),
          };

          const updatedUser = await this.userRepository.update(
            user._id.toString(),
            updateData,
          );

          // Publish user updated event
          await this.rabbitMQClient.publishEvent(
            RABBITMQ_EXCHANGES.EVENTS,
            RABBITMQ_ROUTING_KEYS.USER_UPDATED,
            EVENT_NAMES.USER.UPDATED,
            {
              userId: user._id.toString(),
              email,
              status,
              verifiedAt,
            },
          );

          return updatedUser;
        } catch (error) {
          this.logger.error(
            `Error updating user status via RPC: ${error.message}`,
            error.stack,
          );
          throw error;
        }

      case RPC_METHODS.USER.UPDATE_LAST_LOGIN:
        try {
          const { userId } = message.params;
          const user = await this.userRepository.updateLastLogin(userId);
          if (!user) {
            throw new Error(`User not found with id: ${userId}`);
          }
          return user;
        } catch (error) {
          this.logger.error(
            `Error updating last login via RPC: ${error.message}`,
            error.stack,
          );
          throw error;
        }

      case RPC_METHODS.USER.UPDATE_USER_PASSWORD:
        try {
          const { email, password } = message.params;
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            throw new Error(`User not found with email: ${email}`);
          }

          const updatedUser = await this.userRepository.update(
            user._id.toString(),
            { password: password },
          );

          // Publish user updated event
          await this.rabbitMQClient.publishEvent(
            RABBITMQ_EXCHANGES.EVENTS,
            RABBITMQ_ROUTING_KEYS.USER_UPDATED,
            EVENT_NAMES.USER.UPDATED,
            {
              userId: user._id.toString(),
              email,
              passwordChanged: true,
            },
          );

          return updatedUser;
        } catch (error) {
          this.logger.error(
            `Error updating user password via RPC: ${error.message}`,
            error.stack,
          );
          throw error;
        }

      default:
        throw new Error(`Unknown RPC method: ${message.method}`);
    }
  }
}
