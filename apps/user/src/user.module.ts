import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { UserController } from './user.controller';
import { HealthController } from './health.controller';
import { UserRpcController } from './user-rpc.controller';
import { UserEventController } from './user-event.controller';
import { UserService } from './user.service';
import {
  RabbitMQModule,
  RABBITMQ_CLIENT,
  RabbitMQClient,
} from '@shared/rabbitmq';
import {
  getRabbitMQConfig,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRoot(getRabbitMQConfig()),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController, HealthController, UserRpcController, UserEventController],
  providers: [UserService, UserRepository],
})
export class UserModule implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly userService: UserService,
    private readonly userRpcController: UserRpcController,
    private readonly userEventController: UserEventController,
  ) {}

  async onModuleInit() {
    // Setup exchanges
    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.EVENTS,
      type: 'topic',
      durable: true,
    });

    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.RPC,
      type: 'direct',
      durable: true,
    });

    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.DLX,
      type: 'topic',
      durable: true,
    });

    // Setup queues with DLX
    await this.rabbitMQClient.createQueue(
      {
        name: RABBITMQ_QUEUES.USER_EVENTS,
        durable: true,
      },
      {
        exchange: RABBITMQ_EXCHANGES.DLX,
        routingKey: 'user.dlx',
        ttl: 60000,
      },
    );

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.USER_RPC,
      durable: true,
    });

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.USER_DLX,
      durable: true,
    });

    // Setup bindings
    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.USER_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'user.*',
    });

    // Also subscribe to auth events
    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.USER_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'auth.user.registered',
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.USER_RPC,
      exchange: RABBITMQ_EXCHANGES.RPC,
      routingKey: RABBITMQ_ROUTING_KEYS.RPC_USER,
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.USER_DLX,
      exchange: RABBITMQ_EXCHANGES.DLX,
      routingKey: 'user.dlx',
    });

    // Subscribe to events - using new UserEventController
    await this.rabbitMQClient.subscribeToEvent(
      RABBITMQ_QUEUES.USER_EVENTS,
      this.userEventController.handleEvent.bind(this.userEventController),
    );

    // Handle RPC requests - using new UserRpcController
    await this.rabbitMQClient.handleRPCRequest(
      RABBITMQ_QUEUES.USER_RPC,
      this.userRpcController.handleRPC.bind(this.userRpcController),
    );

    console.log('User service RabbitMQ setup complete');
  }
}
