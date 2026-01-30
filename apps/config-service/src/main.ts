import { NestFactory } from '@nestjs/core';
import { ConfigServiceModule } from './config-service.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';
import { Response } from 'express';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(ConfigServiceModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('ConfigService');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.enableCors({
    origin: '*',
  });

  // Apply global exception filter for standardized error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger/OpenAPI
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Config Service API')
      .setDescription(
        'Flexible configuration storage service for global and user-scoped settings',
      )
      .setVersion('1.0.0')
      .addTag('configs', 'Global configuration management')
      .addTag('user-configs', 'User-scoped configuration management')
      .addBearerAuth()
      .build();

    // Add custom property for service identification
    config['x-service-name'] = 'config-service';

    const document = SwaggerModule.createDocument(app, config);

    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);

    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res: Response) => {
      res.json(document);
    });

    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }

  const port = process.env.CONFIG_SERVICE_PORT || 3004;
  await app.listen(port);

  logger.log(`Config service is running on port ${port}`);
}

void bootstrap();
