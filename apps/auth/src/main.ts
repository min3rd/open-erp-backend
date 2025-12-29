import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('AuthService');
  
  const app = await NestFactory.create(AuthModule);
  
  const port = process.env.AUTH_SERVICE_PORT || 3001;
  await app.listen(port);
  
  logger.log(`Auth service is running on port ${port}`);
}

bootstrap();
