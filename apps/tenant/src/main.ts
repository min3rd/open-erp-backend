import { NestFactory } from '@nestjs/core';
import { TenantModule } from './tenant.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '@shared/errors';

async function bootstrap() {
  const logger = new Logger('TenantService');

  const app = await NestFactory.create(TenantModule);

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
      .setTitle('Tenant Service API')
      .setDescription(
        'Organization and tenant management service - supports corporate hierarchies, memberships, and invitations',
      )
      .setVersion('1.0.0')
      .addTag('organizations')
      .addTag('invitations')
      .addTag('memberships')
      .addTag('relations')
      .addBearerAuth()
      .build();

    // Add custom property for service identification
    config['x-service-name'] = 'tenant-service';

    const document = SwaggerModule.createDocument(app, config);

    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);

    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res) => {
      res.json(document);
    });

    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }

  const port = process.env.TENANT_SERVICE_PORT || 3005;
  await app.listen(port);

  logger.log(`Tenant service is running on port ${port}`);
}

bootstrap();
