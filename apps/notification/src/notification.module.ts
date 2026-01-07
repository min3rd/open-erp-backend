import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { HealthController } from './health.controller';
import { NotificationRpcController } from './notification-rpc.controller';
import { NotificationEventController } from './notification-event.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { RabbitMQClientModule, RabbitMQHealthIndicator } from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy module
    TerminusModule, // Health check module
  ],
  controllers: [
    NotificationController,
    HealthController,
    NotificationRpcController,
    NotificationEventController,
  ],
  providers: [
    NotificationService,
    EmailService,
    {
      provide: RabbitMQHealthIndicator,
      useFactory: () => new RabbitMQHealthIndicator('NotificationService'),
    },
  ],
})
export class NotificationModule {}
