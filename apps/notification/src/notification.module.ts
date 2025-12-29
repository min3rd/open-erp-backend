import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
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

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRoot(getRabbitMQConfig()),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService],
})
export class NotificationModule implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly notificationService: NotificationService,
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
        name: RABBITMQ_QUEUES.NOTIFICATION_EVENTS,
        durable: true,
      },
      {
        exchange: RABBITMQ_EXCHANGES.DLX,
        routingKey: 'notification.dlx',
        ttl: 60000,
      },
    );

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.NOTIFICATION_RPC,
      durable: true,
    });

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.NOTIFICATION_DLX,
      durable: true,
    });

    // Setup bindings - subscribe to auth and user events
    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.NOTIFICATION_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'auth.*',
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.NOTIFICATION_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'user.*',
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.NOTIFICATION_RPC,
      exchange: RABBITMQ_EXCHANGES.RPC,
      routingKey: RABBITMQ_ROUTING_KEYS.RPC_NOTIFICATION,
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.NOTIFICATION_DLX,
      exchange: RABBITMQ_EXCHANGES.DLX,
      routingKey: 'notification.dlx',
    });

    // Subscribe to events
    await this.rabbitMQClient.subscribeToEvent(
      RABBITMQ_QUEUES.NOTIFICATION_EVENTS,
      this.notificationService.handleEvent.bind(this.notificationService),
    );

    // Handle RPC requests
    await this.rabbitMQClient.handleRPCRequest(
      RABBITMQ_QUEUES.NOTIFICATION_RPC,
      this.notificationService.handleRPC.bind(this.notificationService),
    );

    console.log('Notification service RabbitMQ setup complete');
  }
}
