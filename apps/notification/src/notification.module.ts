import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationRpcController } from './notification-rpc.controller';
import { NotificationEventController } from './notification-event.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { RabbitMQModule, RabbitMQClientModule } from '@shared/rabbitmq';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRoot(getRabbitMQConfig()),
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
