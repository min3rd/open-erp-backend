import { Controller, Logger, Inject } from '@nestjs/common';
import { RPC_METHODS, EVENT_NAMES } from '@shared/constants/message.constants';
import { UserRepository, UpdateUserDto } from './repositories/user.repository';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { RPCMessage } from '@shared/types/rabbitmq.types';

/**
 * UserRpcController handles RPC requests for the User service
 * Methods are registered with the custom RabbitMQ client
 */
@Controller()
export class UserRpcController {
  private readonly logger = new Logger(UserRpcController.name);

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  /**
   * Main RPC handler that routes messages to specific methods
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`RPC: ${message.method}`);

    switch (message.method) {
      case RPC_METHODS.USER.GET_USER:
        return await this.getUser(message.params);

      case RPC_METHODS.USER.GET_USER_BY_EMAIL:
      case RPC_METHODS.USER.FIND_USER_BY_EMAIL:
        return await this.getUserByEmail(message.params);

      case RPC_METHODS.USER.FIND_USER_BY_ID:
        return await this.findUserById(message.params);

      case RPC_METHODS.USER.CREATE_USER:
        return await this.createUser(message.params);

      case RPC_METHODS.USER.UPDATE_USER_STATUS:
        return await this.updateUserStatus(message.params);

      case RPC_METHODS.USER.UPDATE_LAST_LOGIN:
        return await this.updateLastLogin(message.params);

      case RPC_METHODS.USER.UPDATE_USER_PASSWORD:
        return await this.updateUserPassword(message.params);

      default:
        throw new Error(`Unknown RPC method: ${message.method}`);
    }
  }

  private async getUser(params: { userId: string }) {
    return await this.userRepository.findById(params.userId);
  }

  private async getUserByEmail(params: {
    email: string;
    includePassword?: boolean;
  }) {
    return await this.userRepository.findByEmail(
      params.email,
      params.includePassword,
    );
  }

  private async findUserById(params: { userId: string }) {
    return await this.userRepository.findById(params.userId);
  }

  private async createUser(params: { username: string; email: string }) {
    try {
      const user = await this.userRepository.create(params);
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
  }

  private async updateUserStatus(params: {
    email: string;
    status: string;
    verifiedAt?: Date;
  }) {
    try {
      const { email, status, verifiedAt } = params;
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
  }

  private async updateLastLogin(params: { userId: string }) {
    try {
      const { userId } = params;
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
  }

  private async updateUserPassword(params: { email: string; password: string }) {
    try {
      const { email, password } = params;
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
  }
}
