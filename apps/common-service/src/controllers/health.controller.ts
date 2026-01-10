import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the common service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'common-service' },
        timestamp: { type: 'string', example: '2024-01-10T08:00:00.000Z' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      service: 'common-service',
      timestamp: new Date().toISOString(),
    };
  }
}
