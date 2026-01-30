import { NestFactory } from '@nestjs/core';
import { OrganizationModule } from './organization.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';

import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(OrganizationModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('OrganizationService');

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
    }),
  );

  // Setup Swagger/OpenAPI
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Organization Service API')
      .setDescription(
        'Organization and corporate hierarchy management service - supports corporate hierarchies, memberships, and invitations',
      )
      .setVersion('1.0.0')
      .addTag('organizations')
      .addTag('invitations')
      .addTag('memberships')
      .addTag('relations')
      .addBearerAuth()
      .build();

    // Add custom property for service identification
    config['x-service-name'] = 'organization-service';

    const document = SwaggerModule.createDocument(app, config);

    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);

    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res) => {
      res.json(document);
    });

    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }

  const port = process.env.ORGANIZATION_SERVICE_PORT || 3005;
  await app.listen(port);

  logger.log(`Organization service is running on port ${port}`);
}

bootstrap();
