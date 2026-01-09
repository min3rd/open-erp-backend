/**
 * Validator for standardized API responses
 * Validates responses against the expected envelope structure
 */

import { ApiResponse, PaginatedData, SingleResourceData } from '../types';

export class ResponseValidator {
  /**
   * Validate that response follows the standard envelope format
   */
  static validateEnvelope(response: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (typeof response !== 'object' || response === null) {
      errors.push('Response must be an object');
      return { valid: false, errors };
    }

    if (typeof response.success !== 'boolean') {
      errors.push('Response must have a boolean "success" field');
    }

    if (!('data' in response)) {
      errors.push('Response must have a "data" field');
    }

    // Check message field (optional but must be string or null)
    if ('message' in response) {
      if (
        response.message !== null &&
        typeof response.message !== 'string'
      ) {
        errors.push('Message must be string or null');
      }
    }

    // Check error field
    if ('error' in response) {
      if (response.error !== null) {
        if (typeof response.error !== 'object') {
          errors.push('Error must be an object or null');
        } else {
          // Validate error structure
          if (typeof response.error.code !== 'string') {
            errors.push('Error must have a string "code" field');
          }
          if (typeof response.error.message !== 'string') {
            errors.push('Error must have a string "message" field');
          }
          if (typeof response.error.timestamp !== 'string') {
            errors.push('Error must have a string "timestamp" field');
          }
        }
      }
    }

    // Validate consistency: if success is false, error should be present
    if (response.success === false) {
      if (!response.error || response.error === null) {
        errors.push('Error field must be present when success is false');
      }
      if (response.data !== null) {
        errors.push('Data must be null when success is false');
      }
    } else if (response.success === true) {
      if (response.error !== null && response.error !== undefined) {
        errors.push('Error must be null when success is true');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate paginated response data structure
   */
  static validatePaginatedData(data: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('Paginated data must be an object');
      return { valid: false, errors };
    }

    // Check required fields
    if (!Array.isArray(data.items)) {
      errors.push('Paginated data must have an "items" array');
    }

    if (typeof data.page !== 'number' || data.page < 1) {
      errors.push('Paginated data must have a valid "page" number (>= 1)');
    }

    if (typeof data.limit !== 'number' || data.limit < 1) {
      errors.push('Paginated data must have a valid "limit" number (>= 1)');
    }

    if (typeof data.total !== 'number' || data.total < 0) {
      errors.push('Paginated data must have a valid "total" number (>= 0)');
    }

    if (typeof data.totalPages !== 'number' || data.totalPages < 0) {
      errors.push(
        'Paginated data must have a valid "totalPages" number (>= 0)',
      );
    }

    // Validate optional sort field
    if ('sort' in data && data.sort !== null && data.sort !== undefined) {
      if (typeof data.sort !== 'object') {
        errors.push('Sort must be an object if present');
      } else {
        if (typeof data.sort.by !== 'string') {
          errors.push('Sort must have a string "by" field');
        }
        if (data.sort.order !== 'asc' && data.sort.order !== 'desc') {
          errors.push('Sort order must be "asc" or "desc"');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate single resource response data structure
   */
  static validateSingleResourceData(data: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('Single resource data must be an object');
      return { valid: false, errors };
    }

    // Check required fields
    const validModes = ['get', 'create', 'update', 'delete'];
    if (!validModes.includes(data.mode)) {
      errors.push(
        `Mode must be one of: ${validModes.join(', ')}. Got: ${data.mode}`,
      );
    }

    if (!('item' in data)) {
      errors.push('Single resource data must have an "item" field');
    }

    // For delete operations, item should be null
    if (data.mode === 'delete' && data.item !== null) {
      errors.push('Item must be null for delete operations');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Complete validation for a response
   */
  static validate(
    response: any,
    options?: {
      expectPaginated?: boolean;
      expectSingleResource?: boolean;
    },
  ): { valid: boolean; errors: string[] } {
    // First validate envelope
    const envelopeResult = this.validateEnvelope(response);
    if (!envelopeResult.valid) {
      return envelopeResult;
    }

    // Then validate data structure if specified
    if (options?.expectPaginated && response.data) {
      const paginatedResult = this.validatePaginatedData(response.data);
      if (!paginatedResult.valid) {
        return paginatedResult;
      }
    }

    if (options?.expectSingleResource && response.data) {
      const singleResourceResult =
        this.validateSingleResourceData(response.data);
      if (!singleResourceResult.valid) {
        return singleResourceResult;
      }
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Jest matcher for validating API response envelope
 */
export function toBeValidApiResponse(
  received: any,
  options?: {
    expectPaginated?: boolean;
    expectSingleResource?: boolean;
  },
) {
  const result = ResponseValidator.validate(received, options);

  if (result.valid) {
    return {
      message: () =>
        `expected response not to be a valid API response envelope`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected response to be a valid API response envelope\nErrors:\n${result.errors.join('\n')}`,
      pass: false,
    };
  }
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(options?: {
        expectPaginated?: boolean;
        expectSingleResource?: boolean;
      }): R;
    }
  }
}
