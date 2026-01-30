import { Module } from '@nestjs/common';
import { LoggerModule } from '@shared/logger';
import { NotificationController } from './notification.controller';
import { NotificationRpcController } from './notification-rpc.controller';
import { NotificationEventController } from './notification-event.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { RabbitMQClientModule } from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule,
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy module
  ],
  controllers: [
    NotificationController,
    NotificationRpcController,
    NotificationEventController,
  ],
  providers: [NotificationService, EmailService],
})
export class NotificationModule {}
