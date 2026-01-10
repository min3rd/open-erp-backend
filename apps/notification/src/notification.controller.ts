import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ok } from '@shared/response';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('email')
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  async sendEmail(@Body() body: { to: string; subject: string; body: string }) {
    const result = await this.notificationService.sendEmail(body);
    return ok(result, 'Email sent successfully');
  }

  @Post('sms')
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid SMS data' })
  async sendSMS(@Body() body: { to: string; message: string }) {
    const result = await this.notificationService.sendSMS(body);
    return ok(result, 'SMS sent successfully');
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return ok(
      { status: 'ok', service: 'notification' },
      'Notification service is healthy',
    );
  }
}
