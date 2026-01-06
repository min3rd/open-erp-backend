import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitMQClient, RABBITMQ_CLIENT, RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';
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
    @Inject(RABBITMQ_NOTIFICATION_CLIENT) private readonly notificationClient: ClientProxy,
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
      try {
        this.notificationClient.emit(EVENT_NAMES.USER.CREATED, user);
      } catch (error) {
        this.logger.warn(`Failed to emit user created event: ${error.message}`);
      }

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
      try {
        this.notificationClient.emit(EVENT_NAMES.USER.UPDATED, { userId: id, changes: data });
      } catch (error) {
        this.logger.warn(`Failed to emit user updated event: ${error.message}`);
      }

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
      try {
        this.notificationClient.emit(EVENT_NAMES.USER.DELETED, { userId: id });
      } catch (error) {
        this.logger.warn(`Failed to emit user deleted event: ${error.message}`);
      }

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
          try {
            this.notificationClient.emit(EVENT_NAMES.USER.CREATED, user);
          } catch (error) {
            this.logger.warn(`Failed to emit user created event: ${error.message}`);
          }
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
          try {
            this.notificationClient.emit(EVENT_NAMES.USER.UPDATED, {
              userId: user._id.toString(),
              email,
              status,
              verifiedAt,
            });
          } catch (error) {
            this.logger.warn(`Failed to emit user updated event: ${error.message}`);
          }

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
          try {
            this.notificationClient.emit(EVENT_NAMES.USER.UPDATED, {
              userId: user._id.toString(),
              email,
              passwordChanged: true,
            });
          } catch (error) {
            this.logger.warn(`Failed to emit user updated event: ${error.message}`);
          }

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
