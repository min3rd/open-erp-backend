import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CommonServiceModule } from './common-service.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    CommonServiceModule,
    new FastifyAdapter({
      bodyLimit: 50 * 1024 * 1024, // 50 MB
    }),
  );
  // Enable CORS
  app.enableCors({
    origin: '*',
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // Global validation pipe
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Common Service API')
    .setDescription(
      'API for managing common master data (provinces, districts, wards) and user addresses',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('provinces', 'Province master data endpoints')
    .addTag('districts', 'District master data endpoints')
    .addTag('wards', 'Ward master data endpoints')
    .addTag('addresses', 'User address management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Export OpenAPI JSON for docs aggregator
  const port = process.env.COMMON_SERVICE_PORT || 3006;
  await app.listen(port);

  console.log(`Common Service is running on: http://localhost:${port}`);
  console.log(`Swagger UI available at: http://localhost:${port}/api`);
  console.log(`OpenAPI JSON available at: http://localhost:${port}/api-json`);
}

bootstrap();
