import { DynamicModule, Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';

export const RABBITMQ_USER_CLIENT = 'RABBITMQ_USER_CLIENT';
export const RABBITMQ_NOTIFICATION_CLIENT = 'RABBITMQ_NOTIFICATION_CLIENT';
export const RABBITMQ_AUTH_CLIENT = 'RABBITMQ_AUTH_CLIENT';

/**
 * RabbitMQClientModule provides NestJS ClientProxy instances for sending messages
 * to microservices using the standard NestJS microservice transport.
 * 
 * This replaces the custom RabbitMQClient for sending RPC requests and events,
 * ensuring compatibility with services that receive messages via @MessagePattern/@EventPattern.
 */
@Global()
@Module({})
export class RabbitMQClientModule {
  static forRoot(): DynamicModule {
    const rabbitMQConfig = getRabbitMQConfig();

    return {
      module: RabbitMQClientModule,
      imports: [
        ClientsModule.register([
          {
            name: RABBITMQ_USER_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMQConfig.url],
              queue: 'user_queue',
              queueOptions: {
                durable: true,
              },
            },
          },
          {
            name: RABBITMQ_NOTIFICATION_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMQConfig.url],
              queue: 'notification_queue',
              queueOptions: {
                durable: true,
              },
            },
          },
          {
            name: RABBITMQ_AUTH_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMQConfig.url],
              queue: 'auth_queue',
              queueOptions: {
                durable: true,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
