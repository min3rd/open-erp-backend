import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RPC_METHODS, EVENT_NAMES } from '@shared/constants/message.constants';
import { UserRepository, UpdateUserDto } from './repositories/user.repository';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';

/**
 * UserRpcController handles RPC requests for the User service
 * Uses @MessagePattern decorators for NestJS microservice pattern
 */
@Controller()
export class UserRpcController {
  private readonly logger = new Logger(UserRpcController.name);

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  @MessagePattern(RPC_METHODS.USER.GET_USER)
  async getUser(@Payload() params: { userId: string }) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.GET_USER}`);
    return await this.userRepository.findById(params.userId);
  }

  @MessagePattern(RPC_METHODS.USER.GET_USER_BY_EMAIL)
  async getUserByEmail(
    @Payload() params: { email: string; includePassword?: boolean },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.GET_USER_BY_EMAIL}`);
    return await this.userRepository.findByEmail(
      params.email,
      params.includePassword,
    );
  }

  @MessagePattern(RPC_METHODS.USER.FIND_USER_BY_EMAIL)
  async findUserByEmail(
    @Payload() params: { email: string; includePassword?: boolean },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.FIND_USER_BY_EMAIL}`);
    return await this.userRepository.findByEmail(
      params.email,
      params.includePassword,
    );
  }

  @MessagePattern(RPC_METHODS.USER.FIND_USER_BY_ID)
  async findUserById(@Payload() params: { userId: string }) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.FIND_USER_BY_ID}`);
    return await this.userRepository.findById(params.userId);
  }

  @MessagePattern(RPC_METHODS.USER.CREATE_USER)
  async createUser(@Payload() params: { username: string; email: string }) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.CREATE_USER}`);
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

  @MessagePattern(RPC_METHODS.USER.UPDATE_USER_STATUS)
  async updateUserStatus(
    @Payload()
    params: {
      email: string;
      status: string;
      verifiedAt?: Date;
    },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.UPDATE_USER_STATUS}`);
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

  @MessagePattern(RPC_METHODS.USER.UPDATE_LAST_LOGIN)
  async updateLastLogin(@Payload() params: { userId: string }) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.UPDATE_LAST_LOGIN}`);
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

  @MessagePattern(RPC_METHODS.USER.UPDATE_USER_PASSWORD)
  async updateUserPassword(
    @Payload() params: { email: string; password: string },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.UPDATE_USER_PASSWORD}`);
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
