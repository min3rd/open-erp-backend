import { DynamicModule, Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';

export const RABBITMQ_USER_CLIENT = 'RABBITMQ_USER_CLIENT';
export const RABBITMQ_NOTIFICATION_CLIENT = 'RABBITMQ_NOTIFICATION_CLIENT';
export const RABBITMQ_AUTH_CLIENT = 'RABBITMQ_AUTH_CLIENT';

/**
 * Helper function to format RabbitMQ URL with credentials
 * Supports both plain URL and URL + username/password format
 */
function formatRabbitMQUrl(config: {
  url: string;
  user?: string;
  password?: string;
}): string {
  let url = config.url;

  // If username and password are provided separately, inject them into the URL
  if (config.user && config.password) {
    // Check if URL already contains credentials (looking for pattern: //user:pass@ or //user@)
    const hasCredentials = /^amqps?:\/\/[^@]+@/.test(url);

    if (!hasCredentials) {
      // URL encode credentials to handle special characters
      const encodedUser = encodeURIComponent(config.user);
      const encodedPassword = encodeURIComponent(config.password);

      // Insert credentials after the protocol (amqp:// or amqps://)
      url = url.replace(
        /^(amqps?:\/\/)/,
        `$1${encodedUser}:${encodedPassword}@`,
      );
    }
  }

  return url;
}

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
    const url = formatRabbitMQUrl(rabbitMQConfig);

    return {
      module: RabbitMQClientModule,
      imports: [
        ClientsModule.register([
          {
            name: RABBITMQ_USER_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [url],
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
              urls: [url],
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
              urls: [url],
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

// Export helper function for use in other modules
export { formatRabbitMQUrl };
