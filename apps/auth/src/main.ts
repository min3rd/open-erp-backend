import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('AuthService');
  
  const app = await NestFactory.create(AuthModule);
  
  // Setup Swagger/OpenAPI
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Auth Service API')
      .setDescription('Authentication and authorization service')
      .setVersion('1.0.0')
      .addTag('auth')
      .build();
    
    // Add custom property for service identification
    config['x-service-name'] = 'auth-service';
    
    const document = SwaggerModule.createDocument(app, config);
    
    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);
    
    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res) => {
      res.json(document);
    });
    
    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }
  
  const port = process.env.AUTH_SERVICE_PORT || 3001;
  await app.listen(port);
  
  logger.log(`Auth service is running on port ${port}`);
}

bootstrap();
