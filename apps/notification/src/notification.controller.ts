import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('email')
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  async sendEmail(@Body() body: { to: string; subject: string; body: string }) {
    return this.notificationService.sendEmail(body);
  }

  @Post('sms')
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid SMS data' })
  async sendSMS(@Body() body: { to: string; message: string }) {
    return this.notificationService.sendSMS(body);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return { status: 'ok', service: 'notification' };
  }
}
