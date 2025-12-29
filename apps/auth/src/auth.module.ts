import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
import { DatabaseModule } from '@shared/database';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { VerificationToken, VerificationTokenSchema } from './schemas/verification-token.schema';
import { VerificationTokenRepository } from './repositories/verification-token.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    RabbitMQModule.forRoot(getRabbitMQConfig()),
    MongooseModule.forFeature([
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 5, // 5 requests per minute
    }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    VerificationTokenRepository,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
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
        name: RABBITMQ_QUEUES.AUTH_EVENTS,
        durable: true,
      },
      {
        exchange: RABBITMQ_EXCHANGES.DLX,
        routingKey: 'auth.dlx',
        ttl: 60000,
      },
    );

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.AUTH_RPC,
      durable: true,
    });

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.AUTH_DLX,
      durable: true,
    });

    // Setup bindings
    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.AUTH_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'auth.*',
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.AUTH_RPC,
      exchange: RABBITMQ_EXCHANGES.RPC,
      routingKey: RABBITMQ_ROUTING_KEYS.RPC_AUTH,
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.AUTH_DLX,
      exchange: RABBITMQ_EXCHANGES.DLX,
      routingKey: 'auth.dlx',
    });

    console.log('Auth service RabbitMQ setup complete');
  }
}
