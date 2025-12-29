import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('NotificationService');
  
  const app = await NestFactory.create(NotificationModule);
  
  const port = process.env.NOTIFICATION_SERVICE_PORT || 3003;
  await app.listen(port);
  
  logger.log(`Notification service is running on port ${port}`);
}

bootstrap();
