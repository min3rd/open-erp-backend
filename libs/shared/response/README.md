# Standardized API Response Module

This module provides types, helpers, and validators for creating standardized API responses across all services.

## Features

- **Type-safe response helpers**: Functions for creating consistent API responses
- **Global interceptor**: Automatically wraps responses in the standard envelope
- **Error handling**: Integrated with the global exception filter
- **Response validation**: Utilities for testing response format compliance
- **JSON schemas**: For contract testing and validation

## Quick Start

### Import helpers

```typescript
import { ok, created, updated, deleted, fetched, paginated } from '@shared/response';
```

### Basic usage in controllers

```typescript
@Controller('users')
export class UserController {
  @Get()
  async listUsers() {
    const { users, total } = await this.userService.findAll();
    return paginated(users, 1, 10, total);
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

## Response Format

All responses follow this envelope:

```typescript
{
  "success": boolean,       // true for 2xx, false for 4xx/5xx
  "message": string | null, // optional human-friendly message
  "error": {                // present when success=false
    "code": string,
    "message": string,
    "details": object,
    "timestamp": string
  } | null,
  "data": any | null,       // response payload
  "meta": object            // optional metadata
}
```

## Available Helpers

### `ok(data, message?, meta?)`
Create a generic successful response.

### `created(item, message?, meta?)`
Create a response for resource creation (mode: 'create').

### `updated(item, message?, meta?)`
Create a response for resource update (mode: 'update').

### `deleted(message?, meta?)`
Create a response for resource deletion (mode: 'delete').

### `fetched(item, message?, meta?)`
Create a response for resource retrieval (mode: 'get').

### `paginated(items, page, limit, total, options?, message?, meta?)`
Create a paginated list response.

### `error(code, message, details?, httpStatus?)`
Create an error response.

### `validationError(details, message?)`
Create a validation error response with field-level details.

## Testing

### Using ResponseValidator

```typescript
import { ResponseValidator } from '@shared/response';

describe('User API Contract Tests', () => {
  it('should return valid response envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    const validation = ResponseValidator.validate(response.body, {
      expectPaginated: true,
    });

    expect(validation.valid).toBe(true);
  });
});
```

## File Structure

```
libs/shared/response/
├── index.ts                 # Module exports
├── types.ts                 # TypeScript type definitions
├── helpers.ts               # Response helper functions
├── interceptor.ts           # Global response interceptor
├── schemas/                 # JSON schemas for validation
│   ├── api-response.schema.json
│   ├── paginated-response.schema.json
│   └── single-resource.schema.json
└── test/
    ├── response-validator.ts   # Response validation utilities
    └── helpers.spec.ts         # Unit tests
```

## Migration Guide

See [API_RESPONSE_FORMAT.md](../../../docs/API_RESPONSE_FORMAT.md) for detailed migration instructions.

## Examples

See [contract tests](../../../test/api-response.contract.spec.ts) for complete examples.
