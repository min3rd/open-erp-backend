# Standardized API Response Format

This document describes the standardized API response envelope format that all endpoints in the open-erp-backend must follow.

## Table of Contents

- [Overview](#overview)
- [Response Envelope Structure](#response-envelope-structure)
- [Response Types](#response-types)
- [Helper Functions](#helper-functions)
- [Error Handling](#error-handling)
- [Migration Guide](#migration-guide)
- [Examples](#examples)
- [Testing](#testing)

## Overview

All API endpoints must return responses wrapped in a standardized envelope format. This provides consistency across all services and makes it easier for frontend clients to handle responses and errors uniformly.

### Key Benefits

- **Consistency**: All endpoints follow the same response structure
- **Error Handling**: Standardized error format with machine-readable codes
- **Frontend Integration**: Simplified client-side response handling
- **Metadata Support**: Extensible metadata for caching, versioning, etc.
- **Type Safety**: Full TypeScript type definitions

## Response Envelope Structure

### Base Structure

Every API response follows this envelope:

```typescript
{
  "success": boolean,      // true for 2xx responses, false for errors
  "message": string | null, // optional human-friendly message
  "error": object | null,   // error details (present when success=false)
  "data": any | null,       // response payload
  "meta": object            // optional metadata
}
```

### Success Response Example

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "id": "123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  },
  "meta": {
    "cached": false
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "message": "User not found",
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 does not exist",
    "details": {
      "userId": "123"
    },
    "timestamp": "2024-01-09T10:30:00.000Z"
  },
  "data": null
}
```

## Response Types

### 1. Single Resource Response

For endpoints that return a single resource (GET, POST, PATCH operations):

```typescript
{
  "success": true,
  "data": {
    "mode": "get" | "create" | "update" | "delete",
    "item": { /* resource object */ } | null
  }
}
```

**Mode Descriptions:**
- `get`: Retrieved an existing resource
- `create`: Created a new resource
- `update`: Updated an existing resource
- `delete`: Deleted a resource (item will be null)

### 2. Paginated Response

For endpoints that return lists with pagination:

```typescript
{
  "success": true,
  "data": {
    "items": [ /* array of resources */ ],
    "query": {
      "q": "search term",
      "filters": { /* applied filters */ }
    },
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "sort": {
      "by": "createdAt",
      "order": "desc"
    }
  }
}
```

### 3. Simple Response

For simple operations or status checks:

```typescript
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* simple data object */ }
}
```

## Helper Functions

The `@shared/response` module provides helper functions for creating standardized responses:

### `ok(data, message?, meta?)`

Create a successful response with data:

```typescript
import { ok } from '@shared/response';

return ok(userData, 'User retrieved successfully');
```

### `created(item, message?, meta?)`

Create a response for resource creation:

```typescript
import { created } from '@shared/response';

const user = await this.userService.create(dto);
return created(user, 'User created successfully');
```

### `updated(item, message?, meta?)`

Create a response for resource update:

```typescript
import { updated } from '@shared/response';

const user = await this.userService.update(id, dto);
return updated(user, 'User updated successfully');
```

### `deleted(message?, meta?)`

Create a response for resource deletion:

```typescript
import { deleted } from '@shared/response';

await this.userService.delete(id);
return deleted('User deleted successfully');
```

### `fetched(item, message?, meta?)`

Create a response for resource retrieval:

```typescript
import { fetched } from '@shared/response';

const user = await this.userService.findById(id);
return fetched(user);
```

### `paginated(items, page, limit, total, options?, message?, meta?)`

Create a paginated response:

```typescript
import { paginated } from '@shared/response';

const { users, total } = await this.userService.findAll(page, limit);
return paginated(
  users,
  page,
  limit,
  total,
  {
    query: { q: searchTerm },
    sort: { by: 'createdAt', order: 'desc' }
  }
);
```

### `error(code, message, details?, httpStatus?)`

Create an error response:

```typescript
import { error } from '@shared/response';

throw new HttpException(
  error('USER_NOT_FOUND', 'User does not exist', { userId: id }),
  HttpStatus.NOT_FOUND
);
```

### `validationError(details, message?)`

Create a validation error response:

```typescript
import { validationError } from '@shared/response';

throw new HttpException(
  validationError({
    email: 'Invalid email format',
    password: 'Password too weak'
  }),
  HttpStatus.BAD_REQUEST
);
```

## Error Handling

### Error Structure

All errors follow this structure:

```typescript
{
  "code": string,        // Machine-readable error code
  "message": string,     // Human-friendly message
  "details": object,     // Additional error details
  "timestamp": string    // ISO 8601 timestamp
}
```

### Common Error Codes

- `USER_NOT_FOUND`: User does not exist
- `VALIDATION_ERROR`: Input validation failed
- `AUTH_UNAUTHORIZED`: Authentication required
- `AUTH_FORBIDDEN`: Insufficient permissions
- `RESOURCE_CONFLICT`: Resource already exists

### Validation Errors

Validation errors should use the `VALIDATION_ERROR` code and include field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    },
    "timestamp": "2024-01-09T10:30:00.000Z"
  },
  "data": null
}
```

## Migration Guide

### For Existing Endpoints

1. **Import helper functions:**
   ```typescript
   import { ok, created, updated, deleted, paginated } from '@shared/response';
   ```

2. **Replace direct returns with helper functions:**
   
   **Before:**
   ```typescript
   async getUser(id: string) {
     return this.userService.findById(id);
   }
   ```
   
   **After:**
   ```typescript
   async getUser(id: string) {
     const user = await this.userService.findById(id);
     return fetched(user);
   }
   ```

3. **Update paginated responses:**
   
   **Before:**
   ```typescript
   async listUsers(page: number, limit: number) {
     return {
       success: true,
       data: users,
       pagination: { page, limit, total }
     };
   }
   ```
   
   **After:**
   ```typescript
   async listUsers(page: number, limit: number) {
     const { users, total } = await this.userService.findAll(page, limit);
     return paginated(users, page, limit, total);
   }
   ```

### Backwards Compatibility

During migration, the system supports a compatibility header:

```
X-Api-Format: legacy
```

When this header is present, the response interceptor will skip envelope wrapping for legacy clients.

## Examples

### Complete Controller Example

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ok, created, updated, deleted, fetched, paginated } from '@shared/response';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async listUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('q') search?: string
  ) {
    const { users, total } = await this.userService.findAll(page, limit, search);
    return paginated(users, page, limit, total, {
      query: { q: search }
    });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    return fetched(user);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.userService.create(dto);
    return created(user, 'User created successfully');
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.userService.update(id, dto);
    return updated(user, 'User updated successfully');
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.userService.delete(id);
    return deleted('User deleted successfully');
  }
}
```

## Testing

### Contract Tests

All endpoints should have contract tests that verify the response format:

```typescript
import { Test } from '@nestjs/testing';
import Ajv from 'ajv';
import apiResponseSchema from '@shared/response/schemas/api-response.schema.json';

describe('User API Contract Tests', () => {
  let app: INestApplication;
  const ajv = new Ajv();
  const validateResponse = ajv.compile(apiResponseSchema);

  beforeAll(async () => {
    // Setup test app
  });

  it('GET /users should return valid response envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    expect(validateResponse(response.body)).toBe(true);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('POST /users should return valid created response', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201);

    expect(validateResponse(response.body)).toBe(true);
    expect(response.body.success).toBe(true);
    expect(response.body.data.mode).toBe('create');
    expect(response.body.data.item).toBeDefined();
  });

  it('should return valid error response for not found', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/nonexistent')
      .expect(404);

    expect(validateResponse(response.body)).toBe(true);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBeDefined();
  });
});
```

## OpenAPI/Swagger Integration

Update your Swagger decorators to document the response envelope:

```typescript
@ApiResponse({
  status: 200,
  description: 'User retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'User retrieved successfully' },
      error: { type: 'null' },
      data: {
        type: 'object',
        properties: {
          mode: { type: 'string', example: 'get' },
          item: { $ref: '#/components/schemas/User' }
        }
      }
    }
  }
})
```

## Summary

- All endpoints must return the standardized envelope format
- Use helper functions from `@shared/response` for consistency
- Errors must include machine-readable codes and timestamps
- Include pagination information for list endpoints
- Include operation mode for single resource endpoints
- Write contract tests to validate response format
- Update OpenAPI documentation to reflect the envelope structure
