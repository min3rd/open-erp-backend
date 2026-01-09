/**
 * Helper functions for creating standardized API responses
 */

import {
  ApiResponse,
  ApiResponseMeta,
  ApiErrorDetails,
  PaginatedData,
  SingleResourceData,
  OperationMode,
} from './types';

/**
 * Create a successful response with data
 * @param data - Response data
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function ok<T>(
  data: T,
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<T> {
  return {
    success: true,
    message: message || null,
    error: null,
    data,
    meta,
  };
}

/**
 * Create a successful response for created resource
 * @param item - Created resource
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function created<T>(
  item: T,
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<SingleResourceData<T>> {
  return {
    success: true,
    message: message || 'Resource created successfully',
    error: null,
    data: {
      mode: 'create',
      item,
    },
    meta,
  };
}

/**
 * Create a successful response for updated resource
 * @param item - Updated resource
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function updated<T>(
  item: T,
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<SingleResourceData<T>> {
  return {
    success: true,
    message: message || 'Resource updated successfully',
    error: null,
    data: {
      mode: 'update',
      item,
    },
    meta,
  };
}

/**
 * Create a successful response for deleted resource
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function deleted(
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<SingleResourceData<null>> {
  return {
    success: true,
    message: message || 'Resource deleted successfully',
    error: null,
    data: {
      mode: 'delete',
      item: null,
    },
    meta,
  };
}

/**
 * Create a successful response for retrieved resource
 * @param item - Retrieved resource
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function fetched<T>(
  item: T,
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<SingleResourceData<T>> {
  return {
    success: true,
    message: message || null,
    error: null,
    data: {
      mode: 'get',
      item,
    },
    meta,
  };
}

/**
 * Create a paginated response
 * @param items - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @param options - Optional additional data (query, sort)
 * @param message - Optional success message
 * @param meta - Optional metadata
 */
export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  options?: {
    query?: { q?: string; filters?: Record<string, any> };
    sort?: { by: string; order: 'asc' | 'desc' };
  },
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponse<PaginatedData<T>> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    message: message || null,
    error: null,
    data: {
      items,
      query: options?.query,
      page,
      limit,
      total,
      totalPages,
      sort: options?.sort,
    },
    meta,
  };
}

/**
 * Create an error response
 * @param code - Error code (e.g., "USER_NOT_FOUND")
 * @param message - Human-friendly error message
 * @param details - Additional error details
 * @param httpStatus - Optional HTTP status code (for documentation)
 */
export function error(
  code: string,
  message: string,
  details?: Record<string, any>,
  httpStatus?: number,
): ApiResponse<null> {
  const errorDetails: ApiErrorDetails = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };

  return {
    success: false,
    message: message,
    error: errorDetails,
    data: null,
  };
}

/**
 * Create a validation error response
 * @param details - Validation error details (field-level errors)
 * @param message - Optional error message
 */
export function validationError(
  details: Record<string, any>,
  message?: string,
): ApiResponse<null> {
  return error(
    'VALIDATION_ERROR',
    message || 'Validation failed',
    details,
    400,
  );
}

/**
 * Wrap existing response data into standardized envelope
 * This helper is useful for migration - wraps legacy responses
 * @param data - Existing response data
 * @param mode - Operation mode (for single resource)
 */
export function wrapLegacyResponse<T>(
  data: any,
  mode?: OperationMode,
): ApiResponse<T> {
  // If already has success field, it might be partially wrapped
  if (data && typeof data === 'object' && 'success' in data) {
    return {
      success: data.success ?? true,
      message: data.message || null,
      error: data.error || null,
      data: data.data !== undefined ? data.data : data,
      meta: data.meta,
    };
  }

  // For single resource with mode
  if (mode) {
    return {
      success: true,
      message: null,
      error: null,
      data: {
        mode,
        item: data,
      } as any,
    };
  }

  // Simple wrap
  return {
    success: true,
    message: null,
    error: null,
    data,
  };
}
