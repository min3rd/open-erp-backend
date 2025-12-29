import { DynamicModule, Module, Global } from '@nestjs/common';
import { RabbitMQClient } from './rabbitmq.client';
import { RabbitMQConfig } from '../types/rabbitmq.types';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(config: RabbitMQConfig): DynamicModule {
    const rabbitmqProvider = {
      provide: RABBITMQ_CLIENT,
      useFactory: async () => {
        const client = new RabbitMQClient(config);
        await client.connect();
        return client;
      },
    };

    return {
      module: RabbitMQModule,
      providers: [rabbitmqProvider],
      exports: [rabbitmqProvider],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig;
    inject?: any[];
  }): DynamicModule {
    const rabbitmqProvider = {
      provide: RABBITMQ_CLIENT,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        const client = new RabbitMQClient(config);
        await client.connect();
        return client;
      },
      inject: options.inject || [],
    };

    return {
      module: RabbitMQModule,
      providers: [rabbitmqProvider],
      exports: [rabbitmqProvider],
    };
  }
}
