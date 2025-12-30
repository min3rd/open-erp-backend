import { HttpStatus } from '@nestjs/common';
import {
  ErrorFactory,
  StandardizedException,
} from '../error.factory';
import {
  AUTH_EMAIL_ALREADY_REGISTERED,
  AUTH_VERIFICATION_RATE_LIMIT,
  VALIDATION_FAILED,
  SYS_INTERNAL_ERROR,
  USER_NOT_FOUND,
} from '../error-codes';

describe('ErrorFactory', () => {
  beforeAll(() => {
    // Set environment variable for testing
    process.env.ERROR_SUPPORT_BASE_URL = 'https://docs.example.com';
  });

  describe('createError', () => {
    it('should create a standardized exception with correct properties', () => {
      const error = ErrorFactory.createError({
        code: AUTH_EMAIL_ALREADY_REGISTERED,
      });

      expect(error).toBeInstanceOf(StandardizedException);
      expect(error.errorCode).toBe('AUTH_0001');
      expect(error.messageKey).toBe('auth.email_already_registered');
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(error.correlationId).toBeDefined();
      expect(error.supportUrl).toContain('/docs/errors/AUTH_0001');
    });

    it('should use custom message key when provided', () => {
      const customMessageKey = 'custom.message.key';
      const error = ErrorFactory.createError({
        code: AUTH_VERIFICATION_RATE_LIMIT,
        messageKey: customMessageKey,
      });

      expect(error.messageKey).toBe(customMessageKey);
    });

    it('should include details when provided', () => {
      const details = {
        field: 'email',
        reason: 'already exists',
      };
      const error = ErrorFactory.createError({
        code: USER_NOT_FOUND,
        details,
      });

      expect(error.details).toEqual(details);
    });

    it('should use provided correlation ID', () => {
      const correlationId = 'test-correlation-id';
      const error = ErrorFactory.createError({
        code: VALIDATION_FAILED,
        correlationId,
      });

      expect(error.correlationId).toBe(correlationId);
    });

    it('should fall back to SYS_0001 for unknown error code', () => {
      const error = ErrorFactory.createError({
        code: 'UNKNOWN_9999',
      });

      expect(error.errorCode).toBe('SYS_0001');
      expect(error.messageKey).toBe('system.internal_error');
      expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('StandardizedException.toErrorResponse', () => {
    it('should convert exception to error response format', () => {
      const error = ErrorFactory.createError({
        code: AUTH_EMAIL_ALREADY_REGISTERED,
        details: { email: 'test@example.com' },
      });

      const response = error.toErrorResponse();

      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('errorCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('details');
      expect(response).toHaveProperty('supportUrl');
      expect(response).toHaveProperty('correlationId');

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.errorCode).toBe('AUTH_0001');
      expect(response.message).toBe('auth.email_already_registered');
      expect(response.details).toEqual({ email: 'test@example.com' });
    });

    it('should format timestamp as ISO 8601', () => {
      const error = ErrorFactory.createError({
        code: SYS_INTERNAL_ERROR,
      });

      const response = error.toErrorResponse();
      const timestamp = new Date(response.timestamp);

      expect(timestamp.toISOString()).toBe(response.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('createErrorResponse', () => {
    it('should handle StandardizedException', () => {
      const exception = ErrorFactory.createError({
        code: AUTH_VERIFICATION_RATE_LIMIT,
        details: { maxAttempts: 3 },
      });

      const response = ErrorFactory.createErrorResponse(exception);

      expect(response.errorCode).toBe('AUTH_0006');
      expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.details).toEqual({ maxAttempts: 3 });
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const response = ErrorFactory.createErrorResponse(error);

      expect(response.errorCode).toBe('SYS_0001');
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.message).toBe('system.internal_error');
    });

    it('should use provided correlation ID', () => {
      const error = new Error('Test error');
      const correlationId = 'test-id-123';
      
      const response = ErrorFactory.createErrorResponse(error, correlationId);

      expect(response.correlationId).toBe(correlationId);
    });

    it('should generate correlation ID if not provided', () => {
      const error = new Error('Test error');
      const response = ErrorFactory.createErrorResponse(error);

      expect(response.correlationId).toBeDefined();
      expect(typeof response.correlationId).toBe('string');
      expect(response.correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('HTTP status mapping', () => {
    const statusTests = [
      { status: HttpStatus.BAD_REQUEST, expectedCode: 'VALIDATION_0001' },
      { status: HttpStatus.UNAUTHORIZED, expectedCode: 'AUTH_0005' },
      { status: HttpStatus.FORBIDDEN, expectedCode: 'RESOURCE_0003' },
      { status: HttpStatus.NOT_FOUND, expectedCode: 'RESOURCE_0001' },
      { status: HttpStatus.CONFLICT, expectedCode: 'RESOURCE_0002' },
      { status: HttpStatus.TOO_MANY_REQUESTS, expectedCode: 'RATE_LIMIT_0001' },
      { status: HttpStatus.SERVICE_UNAVAILABLE, expectedCode: 'SYS_0002' },
      { status: HttpStatus.GATEWAY_TIMEOUT, expectedCode: 'SYS_0003' },
    ];

    statusTests.forEach(({ status, expectedCode }) => {
      it(`should map status ${status} to error code ${expectedCode}`, () => {
        const HttpException = require('@nestjs/common').HttpException;
        const error = new HttpException('Test error', status);
        
        const response = ErrorFactory.createErrorResponse(error);

        expect(response.errorCode).toBe(expectedCode);
        expect(response.status).toBe(status);
      });
    });
  });
});
