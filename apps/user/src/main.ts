import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('UserService');
  
  const app = await NestFactory.create(UserModule);
  
  const port = process.env.USER_SERVICE_PORT || 3002;
  await app.listen(port);
  
  logger.log(`User service is running on port ${port}`);
}

bootstrap();
