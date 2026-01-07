import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';
import {
  createRabbitMQMicroserviceOptions,
  setupGlobalErrorHandlers,
  logMicroserviceEvents,
  RabbitMQHealthIndicator,
} from '@shared/rabbitmq';

async function bootstrap() {
  const logger = new Logger('NotificationService');

  // Setup global error handlers to prevent silent crashes
  setupGlobalErrorHandlers('NotificationService');

  const app = await NestFactory.create(NotificationModule);

  // Connect RabbitMQ microservice with enhanced reliability configuration
  const microserviceOptions = createRabbitMQMicroserviceOptions({
    queueName: 'notification_queue',
    serviceName: 'NotificationService',
  });

  app.connectMicroservice(microserviceOptions);
  logMicroserviceEvents(app, 'NotificationService');

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

  // Get the health indicator and initialize it
  const healthIndicator = app.get(RabbitMQHealthIndicator);
  healthIndicator.initialize();

  // Add a small delay to allow connection to establish
  // Then mark as healthy
  setTimeout(() => {
    healthIndicator.markAsHealthy();
    logger.log('RabbitMQ connection marked as healthy');
  }, 2000);

  const port = process.env.NOTIFICATION_SERVICE_PORT || 3003;
  await app.listen(port);

  logger.log(`Notification service is running on port ${port}`);
}

bootstrap();

