import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ok } from '@shared/response';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return ok(
      {
        status: 'ok',
        service: 'tenant-service',
        timestamp: new Date().toISOString(),
      },
      'Organization service is healthy',
    );
  }
}
