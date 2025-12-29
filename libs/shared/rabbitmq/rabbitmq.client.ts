import { Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import {
  RabbitMQConfig,
  RetryConfig,
  MessageOptions,
  ExchangeConfig,
  QueueConfig,
  BindingConfig,
  DeadLetterConfig,
  EventMessage,
  RPCMessage,
  RPCResponse,
} from '../types/rabbitmq.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * RabbitMQ Client Wrapper
 * Provides retry logic, exponential backoff, idempotency, and ack handling
 */
export class RabbitMQClient {
  private readonly logger = new Logger(RabbitMQClient.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private retryConfig: RetryConfig;
  private pendingRPCs: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor(
    private readonly config: RabbitMQConfig,
    retryConfig?: Partial<RetryConfig>,
  ) {
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      initialDelay: retryConfig?.initialDelay ?? 1000,
      maxDelay: retryConfig?.maxDelay ?? 30000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
    };
  }

  /**
   * Connect to RabbitMQ with retry logic
   */
  async connect(): Promise<void> {
    const connectionUrl = this.buildConnectionUrl();
    
    this.connection = amqp.connect([connectionUrl], {
      heartbeatIntervalInSeconds: this.config.heartbeat ?? 30,
      reconnectTimeInSeconds: 5,
    });

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error('Disconnected from RabbitMQ', err);
    });

    this.connection.on('connectFailed', (err) => {
      this.logger.error('Failed to connect to RabbitMQ', err);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        await channel.prefetch(this.config.prefetch ?? 10);
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('RabbitMQ channel ready');
  }

  /**
   * Build connection URL from config
   */
  private buildConnectionUrl(): string {
    const { url, user, password, vhost } = this.config;
    
    if (url.includes('@')) {
      return url; // URL already contains credentials
    }

    const protocol = url.startsWith('amqps://') ? 'amqps://' : 'amqp://';
    const host = url.replace(/^amqps?:\/\//, '');
    const vhostPath = vhost ? `/${vhost}` : '';
    
    return `${protocol}${user}:${password}@${host}${vhostPath}`;
  }

  /**
   * Create exchange
   */
  async createExchange(config: ExchangeConfig): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.assertExchange(config.name, config.type, {
        durable: config.durable ?? true,
        autoDelete: config.autoDelete ?? false,
        internal: config.internal ?? false,
        arguments: config.arguments,
      });
      this.logger.log(`Exchange created: ${config.name} (${config.type})`);
    });
  }

  /**
   * Create queue with optional dead letter configuration
   */
  async createQueue(config: QueueConfig, deadLetter?: DeadLetterConfig): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      const queueArgs: Record<string, any> = { ...config.arguments };

      if (deadLetter) {
        queueArgs['x-dead-letter-exchange'] = deadLetter.exchange;
        if (deadLetter.routingKey) {
          queueArgs['x-dead-letter-routing-key'] = deadLetter.routingKey;
        }
        if (deadLetter.ttl) {
          queueArgs['x-message-ttl'] = deadLetter.ttl;
        }
      }

      await channel.assertQueue(config.name, {
        durable: config.durable ?? true,
        exclusive: config.exclusive ?? false,
        autoDelete: config.autoDelete ?? false,
        arguments: queueArgs,
      });
      this.logger.log(`Queue created: ${config.name}`);
    });
  }

  /**
   * Bind queue to exchange
   */
  async bindQueue(config: BindingConfig): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.bindQueue(
        config.queue,
        config.exchange,
        config.routingKey,
        config.arguments,
      );
      this.logger.log(
        `Queue bound: ${config.queue} -> ${config.exchange} [${config.routingKey}]`,
      );
    });
  }

  /**
   * Publish event message with retry
   */
  async publishEvent<T>(
    exchange: string,
    routingKey: string,
    eventName: string,
    data: T,
    options?: MessageOptions,
  ): Promise<void> {
    const message: EventMessage<T> = {
      eventName,
      data,
      timestamp: Date.now(),
      messageId: options?.messageId || uuidv4(),
      correlationId: options?.correlationId,
    };

    await this.publishWithRetry(exchange, routingKey, message, options);
  }

  /**
   * Subscribe to events
   */
  async subscribeToEvent<T>(
    queue: string,
    handler: (message: EventMessage<T>) => Promise<void>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const message: EventMessage<T> = JSON.parse(msg.content.toString());
            this.logger.debug(
              `Received event: ${message.eventName} [${message.messageId}]`,
            );

            await handler(message);
            channel.ack(msg);
            this.logger.debug(`Event processed: ${message.messageId}`);
          } catch (error) {
            this.logger.error(
              `Error processing event: ${error.message}`,
              error.stack,
            );
            // Note: In this template, retry count tracking for consumers is simplified.
            // For production, consider using a plugin like rabbitmq-delayed-message-exchange
            // or implement a custom retry mechanism with separate retry queues.
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;
            if (retryCount < this.retryConfig.maxRetries) {
              // Requeue the message for retry (will be redelivered immediately)
              channel.nack(msg, false, true);
            } else {
              channel.nack(msg, false, false); // Send to DLX
              this.logger.warn(`Message sent to DLX after ${retryCount} retries`);
            }
          }
        },
        { noAck: false },
      );
      this.logger.log(`Subscribed to queue: ${queue}`);
    });
  }

  /**
   * Send RPC request
   */
  async sendRPCRequest<TParams, TResponse>(
    exchange: string,
    routingKey: string,
    method: string,
    params: TParams,
    timeout: number = 30000,
  ): Promise<TResponse> {
    const correlationId = uuidv4();
    const messageId = uuidv4();
    const replyQueue = `rpc.reply.${correlationId}`;

    // Create temporary reply queue
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.assertQueue(replyQueue, {
        exclusive: true,
        autoDelete: true,
      });
    });

    const message: RPCMessage<TParams> = {
      method,
      params,
      timestamp: Date.now(),
      messageId,
      correlationId,
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRPCs.delete(correlationId);
        reject(new Error(`RPC timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRPCs.set(correlationId, { resolve, reject, timeout: timeoutHandle });

      // Subscribe to reply queue
      this.channelWrapper.addSetup(async (channel: Channel) => {
        await channel.consume(
          replyQueue,
          (msg: ConsumeMessage | null) => {
            if (!msg) return;

            const response: RPCResponse<TResponse> = JSON.parse(
              msg.content.toString(),
            );

            if (response.correlationId === correlationId) {
              const pending = this.pendingRPCs.get(correlationId);
              if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRPCs.delete(correlationId);

                if (response.success) {
                  pending.resolve(response.data);
                } else {
                  pending.reject(
                    new Error(response.error?.message || 'RPC failed'),
                  );
                }
              }
              channel.ack(msg);
            }
          },
          { noAck: false },
        );
      });

      // Send RPC request
      this.publishWithRetry(exchange, routingKey, message, {
        correlationId,
        replyTo: replyQueue,
        messageId,
      });
    });
  }

  /**
   * Handle RPC requests
   */
  async handleRPCRequest<TParams, TResponse>(
    queue: string,
    handler: (message: RPCMessage<TParams>) => Promise<TResponse>,
  ): Promise<void> {
    await this.channelWrapper.addSetup(async (channel: Channel) => {
      await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          let response: RPCResponse<TResponse>;

          try {
            const request: RPCMessage<TParams> = JSON.parse(
              msg.content.toString(),
            );
            this.logger.debug(
              `Received RPC: ${request.method} [${request.messageId}]`,
            );

            const result = await handler(request);

            response = {
              success: true,
              data: result,
              timestamp: Date.now(),
              messageId: uuidv4(),
              correlationId: request.correlationId,
            };

            channel.ack(msg);
          } catch (error) {
            this.logger.error(`Error processing RPC: ${error.message}`, error.stack);

            response = {
              success: false,
              error: {
                code: 'RPC_ERROR',
                message: error.message,
              },
              timestamp: Date.now(),
              messageId: uuidv4(),
              correlationId: msg.properties.correlationId,
            };

            channel.ack(msg); // Ack even on error to avoid infinite retry
          }

          // Send response
          if (msg.properties.replyTo) {
            await channel.sendToQueue(
              msg.properties.replyTo,
              Buffer.from(JSON.stringify(response)),
              {
                correlationId: msg.properties.correlationId,
              },
            );
          }
        },
        { noAck: false },
      );
      this.logger.log(`Handling RPC requests on queue: ${queue}`);
    });
  }

  /**
   * Publish message with retry and exponential backoff
   */
  private async publishWithRetry(
    exchange: string,
    routingKey: string,
    message: any,
    options?: MessageOptions,
    attempt: number = 0,
  ): Promise<void> {
    try {
      const publishOptions: any = {
        messageId: options?.messageId,
        timestamp: options?.timestamp || Date.now(),
        correlationId: options?.correlationId,
        replyTo: options?.replyTo,
        headers: {
          'x-retry-count': attempt,
        },
      };

      if (options?.expiration) {
        publishOptions.expiration = options.expiration;
      }
      if (options?.priority !== undefined) {
        publishOptions.priority = options.priority;
      }

      await this.channelWrapper.publish(exchange, routingKey, message, publishOptions);

      this.logger.debug(
        `Message published to ${exchange}/${routingKey} [${options?.messageId}]`,
      );
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay,
        );

        this.logger.warn(
          `Publish failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries}), retrying in ${delay}ms...`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.publishWithRetry(exchange, routingKey, message, options, attempt + 1);
      }

      this.logger.error(
        `Failed to publish message after ${this.retryConfig.maxRetries} attempts`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.channelWrapper.close();
    await this.connection.close();
    this.logger.log('RabbitMQ connection closed');
  }
}
