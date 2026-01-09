/**
 * Standardized API Response Envelope
 * All API endpoints must return this format
 */

/**
 * Error details in the response envelope
 */
export interface ApiErrorDetails {
  /**
   * Machine-readable error code (e.g., "USER_NOT_FOUND", "VALIDATION_ERROR")
   */
  code: string;

  /**
   * Human-friendly error message
   */
  message: string;

  /**
   * Additional error details (e.g., validation errors per field)
   */
  details?: Record<string, any>;

  /**
   * ISO 8601 timestamp when the error occurred
   */
  timestamp: string;
}

/**
 * Metadata for additional information
 */
export interface ApiResponseMeta {
  /**
   * ETag for caching
   */
  etag?: string;

  /**
   * Whether the response was served from cache
   */
  cached?: boolean;

  /**
   * Server version
   */
  serverVersion?: string;

  /**
   * Additional metadata fields
   */
  [key: string]: any;
}

/**
 * Standard API response envelope
 * All API endpoints must return this structure
 */
export interface ApiResponse<T = any> {
  /**
   * Indicates if the request was successful (true for 2xx responses)
   */
  success: boolean;

  /**
   * Optional human-friendly message
   */
  message?: string | null;

  /**
   * Error details (present when success=false or 4xx/5xx)
   */
  error?: ApiErrorDetails | null;

  /**
   * Response payload
   */
  data: T | null;

  /**
   * Optional metadata
   */
  meta?: ApiResponseMeta;
}

/**
 * Pagination information for list responses
 */
export interface PaginationInfo {
  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of items
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;
}

/**
 * Sort information
 */
export interface SortInfo {
  /**
   * Field to sort by
   */
  by: string;

  /**
   * Sort order
   */
  order: 'asc' | 'desc';
}

/**
 * Paginated response data structure
 */
export interface PaginatedData<T = any> {
  /**
   * Array of items
   */
  items: T[];

  /**
   * Query parameters used
   */
  query?: {
    q?: string;
    filters?: Record<string, any>;
  };

  /**
   * Current page number
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of items
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Sort information
   */
  sort?: SortInfo;
}

/**
 * Operation mode for single resource responses
 */
export type OperationMode = 'get' | 'create' | 'update' | 'delete';

/**
 * Single resource response data structure
 */
export interface SingleResourceData<T = any> {
  /**
   * Operation mode
   */
  mode: OperationMode;

  /**
   * Resource item (null for delete operations)
   */
  item: T | null;
}

/**
 * Tree node structure for hierarchical data
 */
export interface TreeNode<T = any> {
  /**
   * Node data
   */
  data: T;

  /**
   * Child nodes
   */
  children?: TreeNode<T>[];
}

/**
 * Response format types
 */
export type ResponseFormat = 'flat' | 'tree';
