import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { ErrorFactory } from '../error.factory';
import {
  AUTH_EMAIL_ALREADY_REGISTERED,
  VALIDATION_FAILED,
  SYS_INTERNAL_ERROR,
} from '../error-codes';

// Test DTO with validation
class TestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Test controller
@Controller('test')
class TestController {
  @Get('success')
  success() {
    return { message: 'success' };
  }

  @Get('standard-error')
  standardError() {
    throw ErrorFactory.createError({
      code: AUTH_EMAIL_ALREADY_REGISTERED,
      details: { email: 'test@example.com' },
    });
  }

  @Get('generic-error')
  genericError() {
    throw new Error('Something went wrong');
  }

  @Post('validation')
  validation(@Body() dto: TestDto) {
    return { message: 'validated', data: dto };
  }
}

describe('GlobalExceptionFilter Integration Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = moduleRef.createNestApplication();

    // Apply global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Apply validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Successful requests', () => {
    it('should return normal response for successful requests', () => {
      return request(app.getHttpServer())
        .get('/test/success')
        .expect(HttpStatus.OK)
        .expect({ message: 'success' });
    });
  });

  describe('Standardized errors', () => {
    it('should return standardized error response', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/standard-error')
        .expect(HttpStatus.CONFLICT);

      // Verify response structure
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('correlationId');
      expect(response.body).toHaveProperty('supportUrl');

      // Verify values
      expect(response.body.status).toBe(HttpStatus.CONFLICT);
      expect(response.body.errorCode).toBe('AUTH_0001');
      expect(response.body.message).toBe('auth.email_already_registered');
      expect(response.body.details).toEqual({ email: 'test@example.com' });

      // Verify timestamp is valid ISO 8601
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);

      // Verify correlation ID is present
      expect(response.body.correlationId).toBeDefined();
      expect(typeof response.body.correlationId).toBe('string');
    });
  });

  describe('Generic errors', () => {
    it('should convert generic errors to standardized format', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/generic-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('correlationId');

      expect(response.body.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.errorCode).toBe('SYS_0001');
      expect(response.body.message).toBe('system.internal_error');
    });
  });

  describe('Validation errors', () => {
    it('should return validation errors with details', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('correlationId');

      expect(response.body.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.errorCode).toBe('VALIDATION_0001');
      expect(response.body.message).toBe('validation.failed');

      // Verify details contain validation errors
      expect(response.body.details).toHaveProperty('validationErrors');
      expect(Array.isArray(response.body.details.validationErrors)).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validation')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.errorCode).toBe('VALIDATION_0001');
      expect(response.body.details).toHaveProperty('validationErrors');
    });
  });

  describe('Correlation ID', () => {
    it('should use correlation ID from request header', async () => {
      const correlationId = 'test-correlation-id-123';

      const response = await request(app.getHttpServer())
        .get('/test/standard-error')
        .set('x-correlation-id', correlationId)
        .expect(HttpStatus.CONFLICT);

      expect(response.body.correlationId).toBe(correlationId);
    });

    it('should generate correlation ID if not provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/standard-error')
        .expect(HttpStatus.CONFLICT);

      expect(response.body.correlationId).toBeDefined();

      // Should be a UUID v4
      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.correlationId).toMatch(uuidV4Pattern);
    });
  });

  describe('Response format consistency', () => {
    it('should return JSON for all errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/generic-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect('Content-Type', /json/);

      expect(typeof response.body).toBe('object');
    });

    it('should not expose stack traces in production errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/generic-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('stackTrace');
    });
  });
});
