import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload, ClientProxy } from '@nestjs/microservices';
import { RPC_METHODS, EVENT_NAMES } from '@shared/constants/message.constants';
import { UserRepository, UpdateUserDto } from './repositories/user.repository';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';

/**
 * UserRpcController handles RPC requests for the User service
 * Uses @MessagePattern decorators for NestJS microservice pattern
 */
@Controller()
export class UserRpcController {
  private readonly logger = new Logger(UserRpcController.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    @Inject(RABBITMQ_NOTIFICATION_CLIENT)
    private readonly notificationClient: ClientProxy,
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

  @MessagePattern(RPC_METHODS.USER.FIND_USER_BY_USERNAME)
  async findUserByUsername(
    @Payload() params: { username: string; organizationId?: string },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.FIND_USER_BY_USERNAME}`);
    const user = await this.userRepository.findByUsername(params.username);

    // If organizationId is provided, check if user is member of that organization
    if (params.organizationId && user) {
      const isMember =
        await this.organizationMemberRepository.isUserMemberOfOrganization(
          user._id.toString(),
          params.organizationId,
        );
      return isMember ? user : null;
    }

    return user;
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

      // Publish event using NestJS ClientProxy (fire-and-forget with error logging)
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

      // Publish event using NestJS ClientProxy (fire-and-forget with error logging)
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

      // Publish event using NestJS ClientProxy (fire-and-forget with error logging)
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
  }

  @MessagePattern(RPC_METHODS.USER.GET_USER_ORGANIZATIONS)
  async getUserOrganizations(@Payload() params: { userId: string }) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.GET_USER_ORGANIZATIONS}`);
    try {
      const organizations =
        await this.organizationMemberRepository.findUserOrganizations(
          params.userId,
        );
      return organizations;
    } catch (error) {
      this.logger.error(
        `Error getting user organizations via RPC: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(RPC_METHODS.USER.ADD_USER_TO_ORGANIZATION)
  async addUserToOrganization(
    @Payload()
    params: {
      userId: string;
      organizationId: string;
      role: string;
      invitedBy?: string;
      createdBy?: string;
    },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.ADD_USER_TO_ORGANIZATION}`);
    try {
      // Use the provided createdBy, fallback to invitedBy, and only use 'system' as last resort
      // The 'system' fallback is only for backwards compatibility with older RPC callers
      // that don't provide user IDs. New callers should always provide createdBy or invitedBy.
      const createdBy = params.createdBy || params.invitedBy;

      if (!createdBy) {
        this.logger.warn(
          `No createdBy or invitedBy provided for addUserToOrganization. ` +
            `Using 'system' as fallback. Please update RPC caller to provide user ID.`,
        );
      }

      const membership = await this.organizationMemberRepository.create({
        userId: params.userId,
        organizationId: params.organizationId,
        role: params.role as any,
        invitedBy: params.invitedBy,
        invitedAt: new Date(),
        joinedAt: new Date(),
        createdBy: createdBy || 'system',
      });
      return membership;
    } catch (error) {
      this.logger.error(
        `Error adding user to organization via RPC: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(RPC_METHODS.USER.REMOVE_USER_FROM_ORGANIZATION)
  async removeUserFromOrganization(
    @Payload() params: { userId: string; organizationId: string },
  ) {
    this.logger.log(`RPC: ${RPC_METHODS.USER.REMOVE_USER_FROM_ORGANIZATION}`);
    try {
      const membership =
        await this.organizationMemberRepository.findByUserAndOrganization(
          params.userId,
          params.organizationId,
        );
      if (!membership) {
        throw new Error('Membership not found');
      }
      await this.organizationMemberRepository.delete(membership._id.toString());
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error removing user from organization via RPC: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
