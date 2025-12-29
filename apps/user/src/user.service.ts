import { Injectable, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import { EventMessage, RPCMessage } from '@shared/types/rabbitmq.types';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS } from '@shared/config/rabbitmq.config';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private users: Map<string, any> = new Map();

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  async findAll() {
    return {
      success: true,
      users: Array.from(this.users.values()),
    };
  }

  async findOne(id: string) {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    return { success: true, user };
  }

  async create(data: { username: string; email: string }) {
    const user = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);

    // Publish user created event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.USER_CREATED,
      'user.created',
      user,
    );

    return { success: true, user };
  }

  async update(id: string, data: any) {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const updatedUser = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updatedUser);

    // Publish user updated event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.USER_UPDATED,
      'user.updated',
      { userId: id, changes: data },
    );

    return { success: true, user: updatedUser };
  }

  async delete(id: string) {
    const user = this.users.get(id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    this.users.delete(id);

    // Publish user deleted event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.USER_DELETED,
      'user.deleted',
      { userId: id },
    );

    return { success: true, message: 'User deleted' };
  }

  /**
   * Handle incoming events from other services
   */
  async handleEvent(message: EventMessage<any>) {
    this.logger.log(`Received event: ${message.eventName}`);

    switch (message.eventName) {
      case 'user.registered':
        // Handle user registration from auth service
        this.logger.log(`New user registered: ${JSON.stringify(message.data)}`);
        // Store user data
        if (message.data.userId) {
          this.users.set(message.data.userId, {
            id: message.data.userId,
            username: message.data.username,
            email: message.data.email,
            createdAt: new Date(),
          });
        }
        break;

      case 'user.login':
        this.logger.log(`User logged in: ${message.data.userId}`);
        break;

      default:
        this.logger.debug(`Unhandled event: ${message.eventName}`);
    }
  }

  /**
   * Handle RPC requests
   */
  async handleRPC(message: RPCMessage<any>) {
    this.logger.log(`Received RPC: ${message.method}`);

    switch (message.method) {
      case 'getUser':
        const user = this.users.get(message.params.userId);
        return user || null;

      case 'getUserByEmail':
        const userByEmail = Array.from(this.users.values()).find(
          (u) => u.email === message.params.email,
        );
        return userByEmail || null;

      default:
        throw new Error(`Unknown RPC method: ${message.method}`);
    }
  }
}
