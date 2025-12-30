# Error Handling System

## Overview

This document describes the standardized error handling system implemented for the Open ERP Backend. The system provides consistent error responses across all APIs, supports internationalization (i18n), and follows RFC 7807 Problem Details for HTTP APIs.

## Features

- ✅ Standardized error response format
- ✅ Centralized error code registry
- ✅ Support for client-side localization with message keys
- ✅ Correlation IDs for distributed tracing
- ✅ Detailed validation error information
- ✅ Automatic logging with structured data
- ✅ HTTP status code mapping
- ✅ Support documentation URLs for each error
- ✅ Security-conscious (no sensitive data exposure)
- ✅ Comprehensive test coverage

## Error Response Format

All API errors return JSON in the following standardized format:

```json
{
  "timestamp": "2025-12-30T02:30:45.123Z",
  "status": 409,
  "errorCode": "AUTH_0001",
  "message": "auth.email_already_registered",
  "details": {
    "email": "user@example.com"
  },
  "supportUrl": "https://docs.open-erp.com/docs/errors/AUTH_0001",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string | Yes | ISO 8601 timestamp when the error occurred |
| `status` | number | Yes | HTTP status code (400, 401, 404, 500, etc.) |
| `errorCode` | string | Yes | Application-specific error code for programmatic handling |
| `message` | string | Yes | Message key for client-side localization (e.g., "auth.email_taken") |
| `details` | object | No | Structured additional information (e.g., validation errors) |
| `supportUrl` | string | No | URL to documentation for this specific error |
| `correlationId` | string | No | Unique identifier for tracing across services and logs |

## Error Code Convention

Error codes follow a hierarchical naming convention:

```
{NAMESPACE}_{VERSION}_{SEQUENCE}
```

### Namespaces

- `AUTH_xxxx` - Authentication and authorization errors
- `USER_xxxx` - User management errors
- `VALIDATION_xxxx` - Input validation errors
- `DB_xxxx` - Database-related errors
- `SYS_xxxx` - System-level errors
- `RESOURCE_xxxx` - Resource access errors
- `RATE_LIMIT_xxxx` - Rate limiting errors

### Examples

- `AUTH_0001` - Email already registered
- `USER_0001` - User not found
- `VALIDATION_0001` - Input validation failed
- `DB_0003` - Duplicate key constraint violation
- `SYS_0001` - Internal server error

## Error Registry

All error codes are defined in the centralized registry: `libs/shared/errors/error-registry.json`

Each entry contains:

```json
{
  "code": "AUTH_0001",
  "defaultMessageKey": "auth.email_already_registered",
  "httpStatus": 409,
  "description": "Email is already registered and verified",
  "supportUrl": "/docs/errors/AUTH_0001"
}
```

### Current Error Codes

| Code | HTTP Status | Message Key | Description |
|------|-------------|-------------|-------------|
| AUTH_0001 | 409 | auth.email_already_registered | Email already registered |
| AUTH_0002 | 401 | auth.invalid_credentials | Invalid credentials |
| AUTH_0003 | 401 | auth.token_expired | Token expired |
| AUTH_0004 | 401 | auth.token_invalid | Invalid token |
| AUTH_0005 | 401 | auth.unauthorized | Unauthorized access |
| AUTH_0006 | 429 | auth.verification_rate_limit | Too many verification attempts |
| USER_0001 | 404 | user.not_found | User not found |
| USER_0002 | 409 | user.already_exists | User already exists |
| VALIDATION_0001 | 400 | validation.failed | Validation failed |
| DB_0001 | 503 | database.connection_failed | Database connection failed |
| DB_0003 | 409 | database.duplicate_key | Duplicate key violation |
| SYS_0001 | 500 | system.internal_error | Internal server error |
| RESOURCE_0001 | 404 | resource.not_found | Resource not found |
| RATE_LIMIT_0001 | 429 | rate_limit.exceeded | Rate limit exceeded |

*See full list in `error-registry.json`*

## Internationalization (i18n)

### Message Keys

Instead of literal error messages, the API returns message keys that clients can translate to any language.

### English Messages (en.json)

Located at: `libs/shared/errors/locales/en.json`

Example:

```json
{
  "auth": {
    "email_already_registered": "This email is already registered. Please log in or use a different email.",
    "invalid_credentials": "Invalid email or password. Please check your credentials and try again."
  },
  "user": {
    "not_found": "User not found."
  }
}
```

### Client-Side Implementation

Clients should:

1. Parse the `message` field as a key
2. Look up the translated message in their locale file
3. Display the localized message to users

Example (JavaScript):

```javascript
// Load locale messages
import enMessages from './locales/en.json';
import viMessages from './locales/vi.json';

const messages = { en: enMessages, vi: viMessages };
const locale = 'en'; // or 'vi'

// Parse error response
const error = await response.json();
const messageKey = error.message; // e.g., "auth.email_already_registered"

// Get localized message
const keys = messageKey.split('.');
const localizedMessage = messages[locale][keys[0]][keys[1]];

// Display to user
console.error(localizedMessage);
```

## Usage

### Throwing Standardized Errors

Import and use the error factory:

```typescript
import { ErrorFactory, AUTH_EMAIL_ALREADY_REGISTERED } from '@shared/errors';

// Simple error
throw ErrorFactory.createError({
  code: AUTH_EMAIL_ALREADY_REGISTERED,
});

// Error with details
throw ErrorFactory.createError({
  code: AUTH_VERIFICATION_RATE_LIMIT,
  details: {
    maxAttempts: 3,
    windowMinutes: 60,
  },
});

// Error with custom message key
throw ErrorFactory.createError({
  code: USER_NOT_FOUND,
  messageKey: 'user.not_found_by_email',
  details: { email: 'user@example.com' },
});

// Error with correlation ID (for distributed tracing)
throw ErrorFactory.createError({
  code: DB_CONNECTION_FAILED,
  correlationId: request.headers['x-correlation-id'],
});
```

### Using Error Codes

Import constants for type safety:

```typescript
import {
  AUTH_EMAIL_ALREADY_REGISTERED,
  AUTH_VERIFICATION_RATE_LIMIT,
  USER_NOT_FOUND,
  VALIDATION_FAILED,
  DB_DUPLICATE_KEY,
  SYS_INTERNAL_ERROR,
} from '@shared/errors';
```

### Global Exception Filter

The `GlobalExceptionFilter` automatically catches all exceptions and transforms them to the standardized format. It's already configured in all services.

```typescript
// Already configured in main.ts
import { GlobalExceptionFilter } from '@shared/errors';

app.useGlobalFilters(new GlobalExceptionFilter());
```

### Validation Errors

Validation errors from `class-validator` are automatically formatted with field-level details:

```json
{
  "timestamp": "2025-12-30T02:30:45.123Z",
  "status": 400,
  "errorCode": "VALIDATION_0001",
  "message": "validation.failed",
  "details": {
    "validationErrors": [
      {
        "property": "email",
        "constraints": {
          "isEmail": "email must be an email"
        }
      },
      {
        "property": "password",
        "constraints": {
          "minLength": "password must be longer than or equal to 8 characters"
        }
      }
    ]
  },
  "correlationId": "..."
}
```

## Correlation IDs

Correlation IDs enable tracking of requests across distributed services and logs.

### How It Works

1. Client sends `x-correlation-id` header (optional)
2. If not provided, system generates a UUID v4
3. Correlation ID is included in error responses
4. Correlation ID is logged with all error events

### Example

Client request:

```bash
curl -H "x-correlation-id: abc-123" https://api.example.com/auth/register
```

Error response:

```json
{
  "correlationId": "abc-123",
  ...
}
```

Server logs:

```
[ERROR] correlationId: abc-123, errorCode: AUTH_0001, path: /auth/register
```

## Configuration

Environment variables in `.env`:

```bash
# Path to error registry (relative to project root)
ERROR_REGISTRY_PATH=libs/shared/errors/error-registry.json

# Default locale for error messages
ERROR_DEFAULT_LOCALE=en

# Base URL for error support documentation
ERROR_SUPPORT_BASE_URL=https://docs.open-erp.com
```

## Security Considerations

### What NOT to Include in Error Responses

❌ Stack traces (logged internally, never sent to clients)  
❌ Database query details  
❌ Internal file paths  
❌ Sensitive configuration values  
❌ Raw passwords or credentials  
❌ System architecture details  

### What to Include

✅ User-facing message keys  
✅ Field-level validation errors  
✅ Non-sensitive identifiers (e.g., email for duplicate check)  
✅ Rate limit information  
✅ Documentation URLs  

## Logging and Monitoring

### Structured Logging

All errors are logged with structured data:

```typescript
{
  correlationId: "550e8400-e29b-41d4-a716-446655440000",
  errorCode: "AUTH_0001",
  status: 409,
  message: "auth.email_already_registered",
  path: "/auth/register",
  method: "POST",
  userAgent: "...",
  ip: "192.168.1.1",
  timestamp: "2025-12-30T02:30:45.123Z"
}
```

### Metrics

The system emits metrics for monitoring (placeholder implementation):

- `errors.{errorCode}` - Count per error code
- `http.status.{status}` - Count per HTTP status

Example integration:

```typescript
// In global-exception.filter.ts
private emitMetrics(errorCode: string, status: number) {
  metricsService.increment(`errors.${errorCode}`, 1);
  metricsService.increment(`http.status.${status}`, 1);
}
```

## Testing

### Unit Tests

Test error factory and utilities:

```typescript
import { ErrorFactory, AUTH_EMAIL_ALREADY_REGISTERED } from '@shared/errors';

it('should create standardized error', () => {
  const error = ErrorFactory.createError({
    code: AUTH_EMAIL_ALREADY_REGISTERED,
  });

  expect(error.errorCode).toBe('AUTH_0001');
  expect(error.messageKey).toBe('auth.email_already_registered');
  expect(error.getStatus()).toBe(409);
});
```

### Integration Tests

Test API error responses:

```typescript
it('should return standardized error on duplicate email', async () => {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email: 'existing@example.com', ... })
    .expect(409);

  expect(response.body).toMatchObject({
    status: 409,
    errorCode: 'AUTH_0001',
    message: 'auth.email_already_registered',
    correlationId: expect.any(String),
  });
});
```

## Adding New Error Codes

1. **Add to Registry** (`error-registry.json`):

```json
{
  "code": "AUTH_0009",
  "defaultMessageKey": "auth.password_reset_required",
  "httpStatus": 403,
  "description": "User must reset password before accessing",
  "supportUrl": "/docs/errors/AUTH_0009"
}
```

2. **Add Constant** (`error-codes.ts`):

```typescript
export const AUTH_PASSWORD_RESET_REQUIRED = 'AUTH_0009';
```

3. **Add Message** (`locales/en.json`):

```json
{
  "auth": {
    "password_reset_required": "Please reset your password before continuing."
  }
}
```

4. **Use in Code**:

```typescript
import { ErrorFactory, AUTH_PASSWORD_RESET_REQUIRED } from '@shared/errors';

throw ErrorFactory.createError({
  code: AUTH_PASSWORD_RESET_REQUIRED,
});
```

## Examples

### Example 1: Registration with Duplicate Email

Request:

```bash
POST /auth/register
{
  "email": "existing@example.com",
  "password": "Pass123",
  "fullName": "John Doe"
}
```

Response (409 Conflict):

```json
{
  "timestamp": "2025-12-30T02:30:45.123Z",
  "status": 409,
  "errorCode": "AUTH_0001",
  "message": "auth.email_already_registered",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "supportUrl": "https://docs.open-erp.com/docs/errors/AUTH_0001"
}
```

### Example 2: Validation Error

Request:

```bash
POST /auth/register
{
  "email": "invalid-email",
  "password": "short"
}
```

Response (400 Bad Request):

```json
{
  "timestamp": "2025-12-30T02:31:12.456Z",
  "status": 400,
  "errorCode": "VALIDATION_0001",
  "message": "validation.failed",
  "details": {
    "validationErrors": [
      {
        "property": "email",
        "constraints": {
          "isEmail": "email must be an email"
        }
      },
      {
        "property": "password",
        "constraints": {
          "minLength": "password must be longer than or equal to 8 characters"
        }
      }
    ]
  },
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "supportUrl": "https://docs.open-erp.com/docs/errors/VALIDATION_0001"
}
```

### Example 3: Rate Limit Exceeded

Request (4th attempt within rate limit window):

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "Pass123",
  "fullName": "John Doe"
}
```

Response (429 Too Many Requests):

```json
{
  "timestamp": "2025-12-30T02:32:00.789Z",
  "status": 429,
  "errorCode": "AUTH_0006",
  "message": "auth.verification_rate_limit",
  "details": {
    "maxAttempts": 3,
    "windowMinutes": 60
  },
  "correlationId": "770e8400-e29b-41d4-a716-446655440002",
  "supportUrl": "https://docs.open-erp.com/docs/errors/AUTH_0006"
}
```

## References

- [RFC 7807 - Problem Details for HTTP APIs](https://datatracker.ietf.org/doc/html/rfc7807)
- [Zalando Problem Handling](https://github.com/zalando/problem-handling)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [OWASP Error Handling Cheat Sheet](https://owasp.org/www-project-cheat-sheets/cheatsheets/Error_Handling_Cheat_Sheet.html)

## Acceptance Criteria

✅ API returns standardized JSON for all errors  
✅ Response includes timestamp, status, errorCode, message, correlationId  
✅ Validation errors include field-level details  
✅ Internal errors map to SYS_0001 without exposing internals  
✅ Registry contains 27+ common error codes  
✅ Message keys support client-side localization  
✅ Correlation IDs appear in logs for tracing  
✅ No sensitive data in error responses  
✅ Comprehensive test coverage  
✅ Documentation complete with examples  
