import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';

async function bootstrap() {
  const logger = new Logger('UserService');

  const app = await NestFactory.create(UserModule);

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

  const port = process.env.USER_SERVICE_PORT || 3002;
  await app.listen(port);

  logger.log(`User service is running on port ${port}`);
}

bootstrap();
