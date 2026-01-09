import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from './types';
import { wrapLegacyResponse } from './helpers';

/**
 * Global interceptor to enforce standardized API response envelope
 * Wraps all controller responses in the standard format
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check for legacy format header (for migration compatibility)
    const apiFormat = request.headers['x-api-format'];
    if (apiFormat === 'legacy') {
      // Skip wrapping for legacy clients
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped in the standard envelope, return as-is
        if (this.isStandardEnvelope(data)) {
          return data;
        }

        // Otherwise, wrap it
        return this.wrapResponse(data, response.statusCode);
      }),
      catchError((error) => {
        // Log error for debugging before letting exception filter handle it
        this.logger.error(
          `Error in response interceptor: ${error.message}`,
          error.stack,
        );
        // Let the global exception filter handle errors
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if response is already in standard envelope format
   */
  private isStandardEnvelope(data: any): data is ApiResponse {
    return (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data &&
      typeof data.success === 'boolean'
    );
  }

  /**
   * Wrap response data in standard envelope
   */
  private wrapResponse(data: any, statusCode: number): ApiResponse {
    const success = statusCode >= 200 && statusCode < 300;

    // For successful responses
    if (success) {
      return wrapLegacyResponse(data);
    }

    // For error responses (should be handled by exception filter, but just in case)
    this.logger.warn(
      `Wrapping error response with status ${statusCode}. This should be handled by the exception filter.`,
    );
    return {
      success: false,
      message: 'An error occurred',
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
      data: null,
    };
  }
}
