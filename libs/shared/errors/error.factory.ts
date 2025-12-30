import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorResponse, CreateErrorOptions, ErrorRegistryEntry } from './error.interface';
import { generateCorrelationId } from './correlation-id.util';
import * as errorRegistry from './error-registry.json';

/**
 * Custom exception class that includes standardized error information
 */
export class StandardizedException extends HttpException {
  public readonly errorCode: string;
  public readonly messageKey: string;
  public readonly details?: Record<string, any>;
  public readonly correlationId: string;
  public readonly supportUrl?: string;

  constructor(
    errorCode: string,
    messageKey: string,
    status: number,
    details?: Record<string, any>,
    correlationId?: string,
    supportUrl?: string,
  ) {
    super({ errorCode, messageKey, details }, status);
    this.errorCode = errorCode;
    this.messageKey = messageKey;
    this.details = details;
    this.correlationId = correlationId || generateCorrelationId();
    this.supportUrl = supportUrl;
  }

  toErrorResponse(): ErrorResponse {
    return {
      timestamp: new Date().toISOString(),
      status: this.getStatus(),
      errorCode: this.errorCode,
      message: this.messageKey,
      details: this.details,
      supportUrl: this.supportUrl,
      correlationId: this.correlationId,
    };
  }
}

/**
 * Factory class for creating standardized errors
 */
export class ErrorFactory {
  private static registry: Map<string, ErrorRegistryEntry> = new Map();
  private static supportBaseUrl: string = process.env.ERROR_SUPPORT_BASE_URL || '';

  /**
   * Initialize the error registry
   */
  static initialize() {
    if (this.registry.size === 0) {
      errorRegistry.errors.forEach((entry) => {
        this.registry.set(entry.code, entry);
      });
    }
  }

  /**
   * Get error registry entry by code
   */
  private static getRegistryEntry(code: string): ErrorRegistryEntry {
    this.initialize();
    const entry = this.registry.get(code);
    if (!entry) {
      // Fallback to generic internal error
      return {
        code: 'SYS_0001',
        defaultMessageKey: 'system.internal_error',
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'An internal server error occurred',
        supportUrl: '/docs/errors/SYS_0001',
      };
    }
    return entry;
  }

  /**
   * Create a standardized error
   */
  static createError(options: CreateErrorOptions): StandardizedException {
    const entry = this.getRegistryEntry(options.code);
    const messageKey = options.messageKey || entry.defaultMessageKey;
    const supportUrl = entry.supportUrl
      ? `${this.supportBaseUrl}${entry.supportUrl}`
      : undefined;

    return new StandardizedException(
      entry.code,
      messageKey,
      entry.httpStatus,
      options.details,
      options.correlationId,
      supportUrl,
    );
  }

  /**
   * Create error response from any exception
   */
  static createErrorResponse(
    error: Error,
    correlationId?: string,
  ): ErrorResponse {
    const cid = correlationId || generateCorrelationId();

    // Handle StandardizedException
    if (error instanceof StandardizedException) {
      return error.toErrorResponse();
    }

    // Handle NestJS HttpException
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();

      // Check if it's a validation error
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const details =
          Array.isArray((response as any).message) ||
          typeof (response as any).message === 'object'
            ? { validationErrors: (response as any).message }
            : undefined;

        return {
          timestamp: new Date().toISOString(),
          status,
          errorCode: 'VALIDATION_0001',
          message: 'validation.failed',
          details,
          correlationId: cid,
          supportUrl: `${this.supportBaseUrl}/docs/errors/VALIDATION_0001`,
        };
      }

      // Map HTTP status to error code
      const errorCode = this.mapStatusToErrorCode(status);
      const entry = this.getRegistryEntry(errorCode);

      return {
        timestamp: new Date().toISOString(),
        status,
        errorCode: entry.code,
        message: entry.defaultMessageKey,
        details:
          typeof response === 'object' && 'message' in response
            ? { message: (response as any).message }
            : undefined,
        correlationId: cid,
        supportUrl: entry.supportUrl
          ? `${this.supportBaseUrl}${entry.supportUrl}`
          : undefined,
      };
    }

    // Handle generic errors - return internal server error
    return {
      timestamp: new Date().toISOString(),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'SYS_0001',
      message: 'system.internal_error',
      correlationId: cid,
      supportUrl: `${this.supportBaseUrl}/docs/errors/SYS_0001`,
    };
  }

  /**
   * Map HTTP status code to default error code
   */
  private static mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_0001';
      case HttpStatus.UNAUTHORIZED:
        return 'AUTH_0005';
      case HttpStatus.FORBIDDEN:
        return 'RESOURCE_0003';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_0001';
      case HttpStatus.CONFLICT:
        return 'RESOURCE_0002';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_0001';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SYS_0002';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'SYS_0003';
      default:
        return 'SYS_0001';
    }
  }
}
