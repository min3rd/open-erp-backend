import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RabbitMQHealthIndicator } from '@shared/rabbitmq';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private rabbitMQHealthIndicator: RabbitMQHealthIndicator,
  ) {}

  /**
   * Basic health check - legacy endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return { status: 'ok', service: 'notification' };
  }

  /**
   * Liveness probe - indicates if the service is running
   */
  @Get('health/live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async checkLiveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => Promise.resolve({ liveness: { status: 'up' } }),
    ]);
  }

  /**
   * Readiness probe - indicates if the service is ready to accept traffic
   */
  @Get('health/ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - checks RabbitMQ connection' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.rabbitMQHealthIndicator.isHealthy('rabbitmq'),
    ]);
  }
}
