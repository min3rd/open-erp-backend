/**
 * Standardized error codes for the application
 * These constants provide type-safe access to error codes defined in the registry
 */

// Authentication errors
export const AUTH_EMAIL_ALREADY_REGISTERED = 'AUTH_0001';
export const AUTH_INVALID_CREDENTIALS = 'AUTH_0002';
export const AUTH_TOKEN_EXPIRED = 'AUTH_0003';
export const AUTH_TOKEN_INVALID = 'AUTH_0004';
export const AUTH_UNAUTHORIZED = 'AUTH_0005';
export const AUTH_VERIFICATION_RATE_LIMIT = 'AUTH_0006';
export const AUTH_VERIFICATION_CODE_EXPIRED = 'AUTH_0007';
export const AUTH_VERIFICATION_CODE_INVALID = 'AUTH_0008';
export const AUTH_USER_ALREADY_VERIFIED = 'AUTH_0009';

// User errors
export const USER_NOT_FOUND = 'USER_0001';
export const USER_ALREADY_EXISTS = 'USER_0002';
export const USER_INVALID_STATUS = 'USER_0003';
export const USER_PROFILE_INCOMPLETE = 'USER_0004';

// Validation errors
export const VALIDATION_FAILED = 'VALIDATION_0001';
export const VALIDATION_EMAIL_INVALID = 'VALIDATION_0002';
export const VALIDATION_PASSWORD_WEAK = 'VALIDATION_0003';

// Database errors
export const DB_CONNECTION_FAILED = 'DB_0001';
export const DB_QUERY_FAILED = 'DB_0002';
export const DB_DUPLICATE_KEY = 'DB_0003';
export const DB_TRANSACTION_FAILED = 'DB_0004';

// System errors
export const SYS_INTERNAL_ERROR = 'SYS_0001';
export const SYS_SERVICE_UNAVAILABLE = 'SYS_0002';
export const SYS_TIMEOUT = 'SYS_0003';
export const SYS_CONFIGURATION_ERROR = 'SYS_0004';

// Resource errors
export const RESOURCE_NOT_FOUND = 'RESOURCE_0001';
export const RESOURCE_CONFLICT = 'RESOURCE_0002';
export const RESOURCE_FORBIDDEN = 'RESOURCE_0003';

// Rate limiting errors
export const RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_0001';
