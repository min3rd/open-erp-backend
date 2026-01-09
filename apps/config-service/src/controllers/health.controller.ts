import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@shared/authz/decorators';
import { ok } from '@shared/response';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return ok(
      {
        status: 'ok',
        service: 'config-service',
        timestamp: new Date().toISOString(),
      },
      'Config service is healthy',
    );
  }
}
