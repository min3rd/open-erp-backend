import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique correlation ID for tracing requests and errors
 * @returns A UUID v4 string
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Extracts correlation ID from various sources (headers, context, etc.)
 * @param request Optional request object to extract from
 * @returns Correlation ID or generates a new one
 */
export function getOrCreateCorrelationId(request?: any): string {
  // Try to get from request headers first
  if (request?.headers?.['x-correlation-id']) {
    return request.headers['x-correlation-id'];
  }

  // Try to get from request ID
  if (request?.id) {
    return request.id;
  }

  // Generate new one if not found
  return generateCorrelationId();
}
