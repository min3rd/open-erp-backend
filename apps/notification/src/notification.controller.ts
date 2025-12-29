import { Controller, Post, Body, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('email')
  async sendEmail(@Body() body: { to: string; subject: string; body: string }) {
    return this.notificationService.sendEmail(body);
  }

  @Post('sms')
  async sendSMS(@Body() body: { to: string; message: string }) {
    return this.notificationService.sendSMS(body);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'notification' };
  }
}
