/**
 * RabbitMQ Message Types and Interfaces
 */

export interface RabbitMQConfig {
  url: string;
  user: string;
  password: string;
  vhost?: string;
  prefetch?: number;
  heartbeat?: number;
  connectionTimeout?: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface MessageOptions {
  persistent?: boolean;
  expiration?: string;
  priority?: number;
  messageId?: string;
  timestamp?: number;
  correlationId?: string;
  replyTo?: string;
}

export interface QueueConfig {
  name: string;
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  internal?: boolean;
  arguments?: Record<string, any>;
}

export interface BindingConfig {
  queue: string;
  exchange: string;
  routingKey: string;
  arguments?: Record<string, any>;
}

export interface DeadLetterConfig {
  exchange: string;
  routingKey?: string;
  ttl?: number;
}

export interface EventMessage<T = any> {
  eventName: string;
  data: T;
  timestamp: number;
  messageId: string;
  correlationId?: string;
}

export interface RPCMessage<T = any> {
  method: string;
  params: T;
  timestamp: number;
  messageId: string;
  correlationId: string;
}

export interface RPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
  messageId: string;
  correlationId: string;
}
