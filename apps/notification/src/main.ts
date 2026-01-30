import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';
import { formatRabbitMQUrl } from '@shared/rabbitmq';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('NotificationService');

  // Connect RabbitMQ microservice
  const rabbitMQConfig = getRabbitMQConfig();
  const url = formatRabbitMQUrl(rabbitMQConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: 'notification_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Apply global exception filter for standardized error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger/OpenAPI
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Notification Service API')
      .setDescription('Email and SMS notification service')
      .setVersion('1.0.0')
      .addTag('notifications')
      .build();

    // Add custom property for service identification
    config['x-service-name'] = 'notification-service';

    const document = SwaggerModule.createDocument(app, config);

    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);

    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res) => {
      res.json(document);
    });

    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }

  // Start all microservices
  await app.startAllMicroservices();
  logger.log('Notification service microservices started');

  const port = process.env.NOTIFICATION_SERVICE_PORT || 3003;
  await app.listen(port);

  logger.log(`Notification service is running on port ${port}`);
}

bootstrap();
