/**
 * Error response interface following RFC 7807 Problem Details for HTTP APIs
 * Extended with custom fields for correlation and localization
 */
export interface ErrorResponse {
  /**
   * ISO 8601 timestamp when the error occurred
   */
  timestamp: string;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Application-specific error code for programmatic handling
   */
  errorCode: string;

  /**
   * Message key for client-side localization
   * Format: "namespace.error_name" (e.g., "auth.email_taken")
   */
  message: string;

  /**
   * Detailed error information (e.g., validation errors per field)
   * Should not contain sensitive data
   */
  details?: Record<string, any>;

  /**
   * URL to documentation or support for this specific error
   */
  supportUrl?: string;

  /**
   * Unique identifier for tracing this error across logs and services
   */
  correlationId?: string;
}

/**
 * Error registry entry containing metadata about each error code
 */
export interface ErrorRegistryEntry {
  /**
   * Unique error code (e.g., "AUTH_0001")
   */
  code: string;

  /**
   * Default message key for localization
   */
  defaultMessageKey: string;

  /**
   * HTTP status code to use for this error
   */
  httpStatus: number;

  /**
   * Description of the error for developers
   */
  description: string;

  /**
   * URL to documentation for this error
   */
  supportUrl?: string;
}

/**
 * Error registry containing all error codes
 */
export interface ErrorRegistry {
  errors: ErrorRegistryEntry[];
}

/**
 * Options for creating a standardized error
 */
export interface CreateErrorOptions {
  /**
   * Error code from the registry
   */
  code: string;

  /**
   * Optional message key override (defaults to registry entry)
   */
  messageKey?: string;

  /**
   * Additional details (e.g., validation errors)
   */
  details?: Record<string, any>;

  /**
   * Original error that caused this (for internal logging only)
   */
  cause?: Error;

  /**
   * Correlation ID for tracing (auto-generated if not provided)
   */
  correlationId?: string;
}
