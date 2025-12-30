import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorFactory } from './error.factory';
import { ErrorResponse } from './error.interface';
import { getOrCreateCorrelationId } from './correlation-id.util';

/**
 * Global exception filter that catches all exceptions and transforms them
 * into standardized error responses following RFC 7807 Problem Details
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Get or create correlation ID
    const correlationId = getOrCreateCorrelationId(request);

    // Create standardized error response
    let errorResponse: ErrorResponse;

    // If the exception already has a correlation ID from StandardizedException, preserve it
    // Otherwise use the one from the request
    if (exception instanceof Error && 'toErrorResponse' in exception) {
      errorResponse = (exception as any).toErrorResponse();
      // Override with request correlation ID if present
      if (request.headers?.['x-correlation-id']) {
        errorResponse.correlationId = request.headers['x-correlation-id'];
      }
    } else {
      errorResponse = ErrorFactory.createErrorResponse(
        exception,
        correlationId,
      );
    }

    // Log the error with correlation ID for tracing
    this.logError(exception, errorResponse, request);

    // Send standardized error response
    response.status(errorResponse.status).json(errorResponse);
  }

  /**
   * Log error with structured information for monitoring and debugging
   */
  private logError(
    exception: Error,
    errorResponse: ErrorResponse,
    request: any,
  ) {
    const logData = {
      correlationId: errorResponse.correlationId,
      errorCode: errorResponse.errorCode,
      status: errorResponse.status,
      message: errorResponse.message,
      path: request.url,
      method: request.method,
      userAgent: request.headers?.['user-agent'],
      ip: request.ip,
      timestamp: errorResponse.timestamp,
    };

    // Log at appropriate level based on status code
    if (errorResponse.status >= 500) {
      this.logger.error(`Server Error: ${errorResponse.errorCode}`, {
        ...logData,
        stack: exception.stack,
        exceptionName: exception.name,
        exceptionMessage: exception.message,
      });
    } else if (errorResponse.status >= 400) {
      this.logger.warn(`Client Error: ${errorResponse.errorCode}`, logData);
    } else {
      this.logger.log(`Error: ${errorResponse.errorCode}`, logData);
    }

    // Emit metrics for monitoring (can be extended with actual metrics service)
    this.emitMetrics(errorResponse.errorCode, errorResponse.status);
  }

  /**
   * Emit metrics for error monitoring
   * This is a placeholder that can be extended with actual metrics implementation
   */
  private emitMetrics(errorCode: string, status: number) {
    // TODO: Implement actual metrics emission
    // Example: metricsService.increment(`errors.${errorCode}`, 1);
    // Example: metricsService.increment(`http.status.${status}`, 1);
  }
}
