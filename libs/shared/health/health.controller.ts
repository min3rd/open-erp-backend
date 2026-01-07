/**
 * Health Check Controller
 * Provides /health endpoints for liveness and readiness probes
 */

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from '../rabbitmq/rabbitmq-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private rabbitMQHealthIndicator: RabbitMQHealthIndicator,
  ) {}

  /**
   * Liveness probe - indicates if the service is running
   * Returns 200 if the service process is alive
   */
  @Get('live')
  @HealthCheck()
  checkLiveness(): HealthCheckResult {
    return this.health.check([
      // Just check if the service is alive (always passes unless process is dead)
      () => Promise.resolve({ liveness: { status: 'up' } }),
    ]);
  }

  /**
   * Readiness probe - indicates if the service is ready to accept traffic
   * Returns 200 if RabbitMQ connection is healthy
   * Returns 503 if RabbitMQ connection is down
   */
  @Get('ready')
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.rabbitMQHealthIndicator.isHealthy('rabbitmq'),
    ]);
  }

  /**
   * Combined health check - checks all dependencies
   * Returns detailed health status of all components
   */
  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.rabbitMQHealthIndicator.isHealthy('rabbitmq'),
    ]);
  }
}
