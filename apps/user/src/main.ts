import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
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
  const logger = new Logger('UserService');

  // Setup global error handlers to prevent silent crashes
  setupGlobalErrorHandlers('UserService');

  const app = await NestFactory.create(UserModule);

  // Connect RabbitMQ microservice with enhanced reliability configuration
  const microserviceOptions = createRabbitMQMicroserviceOptions({
    queueName: 'user_queue',
    serviceName: 'UserService',
  });

  app.connectMicroservice(microserviceOptions);
  logMicroserviceEvents(app, 'UserService');

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
      .setTitle('User Service API')
      .setDescription('User management and profiles service')
      .setVersion('1.0.0')
      .addTag('users')
      .build();

    // Add custom property for service identification
    config['x-service-name'] = 'user-service';

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
  logger.log('User service microservices started');

  // Mark RabbitMQ as healthy after successful connection
  // Get the health indicator from the app context
  const healthIndicator = app.get(RabbitMQHealthIndicator);
  healthIndicator.markAsHealthy();
  logger.log('RabbitMQ connection marked as healthy');

  const port = process.env.USER_SERVICE_PORT || 3002;
  await app.listen(port);

  logger.log(`User service is running on port ${port}`);
}

bootstrap();

