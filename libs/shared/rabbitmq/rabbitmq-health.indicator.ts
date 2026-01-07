/**
 * RabbitMQ Health Indicator
 * Custom health indicator for monitoring RabbitMQ connection status
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

/**
 * Interface for tracking RabbitMQ connection state
 */
export interface RabbitMQHealthState {
  isConnected: boolean;
  lastCheckTime: Date;
  lastConnectedTime?: Date;
  lastDisconnectedTime?: Date;
  consecutiveFailures: number;
}

/**
 * Global state tracker for RabbitMQ connections
 * This allows services to report their connection status
 */
const healthStates = new Map<string, RabbitMQHealthState>();

/**
 * Register or update health state for a service
 */
export function updateRabbitMQHealthState(
  serviceName: string,
  isConnected: boolean,
): void {
  const currentState = healthStates.get(serviceName);
  const now = new Date();

  if (!currentState) {
    healthStates.set(serviceName, {
      isConnected,
      lastCheckTime: now,
      lastConnectedTime: isConnected ? now : undefined,
      lastDisconnectedTime: !isConnected ? now : undefined,
      consecutiveFailures: isConnected ? 0 : 1,
    });
  } else {
    healthStates.set(serviceName, {
      ...currentState,
      isConnected,
      lastCheckTime: now,
      lastConnectedTime: isConnected ? now : currentState.lastConnectedTime,
      lastDisconnectedTime: !isConnected ? now : currentState.lastDisconnectedTime,
      consecutiveFailures: isConnected ? 0 : currentState.consecutiveFailures + 1,
    });
  }
}

/**
 * Get health state for a service
 */
export function getRabbitMQHealthState(serviceName: string): RabbitMQHealthState | undefined {
  return healthStates.get(serviceName);
}

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RabbitMQHealthIndicator.name);
  
  constructor(private readonly serviceName: string) {
    super();
    // Initialize state as disconnected until first connection
    updateRabbitMQHealthState(serviceName, false);
  }

  /**
   * Check if RabbitMQ connection is healthy
   * This is used by the /health endpoint
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const state = getRabbitMQHealthState(this.serviceName);
    
    if (!state) {
      this.logger.warn(`No health state found for ${this.serviceName}`);
      throw new HealthCheckError(
        'RabbitMQ health check failed',
        this.getStatus(key, false, { error: 'No state available' }),
      );
    }

    const isHealthy = state.isConnected;
    const result = this.getStatus(key, isHealthy, {
      lastCheckTime: state.lastCheckTime.toISOString(),
      lastConnectedTime: state.lastConnectedTime?.toISOString(),
      lastDisconnectedTime: state.lastDisconnectedTime?.toISOString(),
      consecutiveFailures: state.consecutiveFailures,
    });

    if (isHealthy) {
      return result;
    }

    this.logger.error(
      `RabbitMQ health check failed for ${this.serviceName}. ` +
      `Consecutive failures: ${state.consecutiveFailures}`,
    );
    
    throw new HealthCheckError('RabbitMQ health check failed', result);
  }

  /**
   * Mark connection as healthy
   * Should be called when connection is established
   */
  markAsHealthy(): void {
    this.logger.log(`RabbitMQ connection healthy for ${this.serviceName}`);
    updateRabbitMQHealthState(this.serviceName, true);
  }

  /**
   * Mark connection as unhealthy
   * Should be called when connection fails or is lost
   */
  markAsUnhealthy(): void {
    this.logger.warn(`RabbitMQ connection unhealthy for ${this.serviceName}`);
    updateRabbitMQHealthState(this.serviceName, false);
  }
}
