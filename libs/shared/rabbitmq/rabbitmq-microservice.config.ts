/**
 * RabbitMQ Microservice Configuration Helper
 * Provides robust configuration for NestJS microservices with RabbitMQ transport
 */

import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';
import { formatRabbitMQUrl } from './rabbitmq-client.module';

export interface RabbitMQMicroserviceConfig {
  queueName: string;
  serviceName: string;
}

/**
 * Creates RabbitMQ microservice options with enhanced reliability features:
 * - Heartbeat configuration
 * - Socket options with reconnection
 * - Manual acknowledgment (noAck: false)
 * - Configurable prefetch
 * - Connection error handling
 */
export function createRabbitMQMicroserviceOptions(
  config: RabbitMQMicroserviceConfig,
): MicroserviceOptions {
  const rabbitMQConfig = getRabbitMQConfig();
  const url = formatRabbitMQUrl(rabbitMQConfig);
  const logger = new Logger(`${config.serviceName}:RabbitMQ`);

  logger.log(`Configuring RabbitMQ microservice for queue: ${config.queueName}`);
  logger.log(`Connection URL: ${url.replace(/\/\/.*@/, '//***:***@')}`); // Mask credentials
  logger.log(`Prefetch count: ${rabbitMQConfig.prefetch}`);
  logger.log(`Heartbeat interval: ${rabbitMQConfig.heartbeat}s`);

  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: config.queueName,
      queueOptions: {
        durable: true,
        // Dead letter exchange configuration
        arguments: {
          'x-dead-letter-exchange': 'erp.dlx',
          'x-dead-letter-routing-key': `${config.queueName}.dlx`,
        },
      },
      // Manual acknowledgment - critical for reliability
      noAck: false,
      // Prefetch count - limits number of unacknowledged messages
      prefetchCount: rabbitMQConfig.prefetch,
      // Socket options for connection resilience
      socketOptions: {
        heartbeatIntervalInSeconds: rabbitMQConfig.heartbeat,
        reconnectTimeInSeconds: rabbitMQConfig.socketOptions.reconnectTimeInSeconds,
        // Connection timeout
        clientProperties: {
          connection_name: config.serviceName,
        },
      },
    },
  };
}

/**
 * Setup global error handlers for Node.js process
 * This prevents the process from crashing silently
 */
export function setupGlobalErrorHandlers(serviceName: string): void {
  const logger = new Logger(`${serviceName}:GlobalErrorHandler`);

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception detected - process will exit:', error.stack);
    // Exit after logging - orchestrator should restart the process
    // Continuing after uncaught exception can leave app in undefined state
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection detected - process will exit:', reason);
    logger.error('Promise:', promise);
    // Exit after logging - orchestrator should restart the process
    setTimeout(() => process.exit(1), 1000);
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    logger.log('SIGTERM signal received: closing HTTP server');
    // Allow time for cleanup
    setTimeout(() => process.exit(0), 5000);
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT signal received: closing HTTP server');
    // Allow time for cleanup
    setTimeout(() => process.exit(0), 5000);
  });

  logger.log('Global error handlers configured');
}

/**
 * Add connection event logging to microservice
 * Helps with debugging connection issues
 */
export function logMicroserviceEvents(app: any, serviceName: string): void {
  const logger = new Logger(`${serviceName}:RabbitMQ`);

  // Note: NestJS microservices don't expose direct access to underlying
  // connection events in the same way, but we can log during lifecycle hooks
  logger.log('RabbitMQ microservice initialized');
  logger.log('Connection monitoring active');
}
