import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('DocsAggregator');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Docs aggregator is running on port ${port}`);
  logger.log(`Access the API documentation at http://localhost:${port}/docs`);
}
bootstrap();
