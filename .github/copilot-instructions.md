# GitHub Copilot Instructions for open-erp-backend

This document provides coding guidelines and conventions for the open-erp-backend project to help GitHub Copilot generate consistent, high-quality code.

## Table of Contents

- [General Guidelines](#general-guidelines)
- [API Response Format](#api-response-format)
- [Error Handling](#error-handling)
- [TypeScript Conventions](#typescript-conventions)
- [NestJS Best Practices](#nestjs-best-practices)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)

## General Guidelines

- Use TypeScript for all code
- Follow NestJS framework conventions
- Write clean, maintainable, and well-documented code
- Use dependency injection for all services
- Follow SOLID principles
- Use async/await instead of raw promises
- Enable strict TypeScript mode

## API Response Format

### **MANDATORY: All HTTP API endpoints MUST return the standardized response envelope**

Every API endpoint must return responses wrapped in the standard envelope format:

```typescript
{
  "success": boolean,       // true for 2xx, false for 4xx/5xx
  "message": string | null, // optional human-friendly message
  "error": {                // present when success=false
    "code": string,         // machine-readable code (e.g., "USER_NOT_FOUND")
    "message": string,      // human-friendly message
    "details": object,      // additional error details (e.g., validation errors)
    "timestamp": string     // ISO 8601 timestamp
  } | null,
  "data": any | null,       // response payload
  "meta": object            // optional metadata (etag, cached, serverVersion, etc.)
}
```

### Required Helper Functions

**ALWAYS** use the response helper functions from `@shared/response`:

```typescript
import { ok, created, updated, deleted, fetched, paginated, error, validationError } from '@shared/response';
```

### Response Types

1. **Single Resource (GET, POST, PATCH):**
   ```typescript
   // For GET
   const user = await this.userService.findById(id);
   return fetched(user);
   
   // For POST
   const user = await this.userService.create(dto);
   return created(user, 'User created successfully');
   
   // For PATCH
   const user = await this.userService.update(id, dto);
   return updated(user, 'User updated successfully');
   
   // For DELETE
   await this.userService.delete(id);
   return deleted('User deleted successfully');
   ```

2. **Paginated Lists:**
   ```typescript
   const { items, total } = await this.service.findAll(page, limit);
   return paginated(items, page, limit, total, {
     query: { q: searchTerm },
     sort: { by: 'createdAt', order: 'desc' }
   });
   ```

3. **Simple Response:**
   ```typescript
   return ok(data, 'Operation successful');
   ```

### Error Responses

Use standardized error codes and the error helper:

```typescript
import { error, validationError } from '@shared/response';
import { HttpException, HttpStatus } from '@nestjs/common';

// For validation errors
throw new HttpException(
  validationError({
    email: 'Invalid email format',
    password: 'Password too weak'
  }),
  HttpStatus.BAD_REQUEST
);

// For other errors
throw new HttpException(
  error('USER_NOT_FOUND', 'User does not exist', { userId: id }),
  HttpStatus.NOT_FOUND
);
```

### OpenAPI Documentation

**ALWAYS** update OpenAPI/Swagger documentation when creating or modifying API endpoints:

```typescript
@ApiResponse({
  status: 200,
  description: 'Success response',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', nullable: true },
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

### Testing Requirements for API Endpoints

**Every new or modified API endpoint MUST include a contract test** that validates the response format:

```typescript
import Ajv from 'ajv';
import apiResponseSchema from '@shared/response/schemas/api-response.schema.json';

describe('API Contract Tests', () => {
  const ajv = new Ajv();
  const validateResponse = ajv.compile(apiResponseSchema);

  it('should return valid response envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/endpoint')
      .expect(200);

    expect(validateResponse(response.body)).toBe(true);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
```

## Error Handling

### Use Standardized Error Codes

Errors should use predefined error codes from `@shared/errors/error-codes`:

```typescript
import { USER_NOT_FOUND, VALIDATION_FAILED } from '@shared/errors/error-codes';
```

### Error Response Structure

All errors must include:
- `code`: Machine-readable error code (e.g., "USER_NOT_FOUND")
- `message`: Human-friendly error message
- `details`: Additional context (for validation errors, include field-level details)
- `timestamp`: ISO 8601 timestamp

### Validation Errors

For validation errors, always provide field-level details:

```typescript
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

## TypeScript Conventions

- Use interfaces for data structures
- Use types for unions and complex types
- Always define return types for functions
- Use strict null checks
- Avoid `any` type - use `unknown` if type is truly unknown
- Use enums for fixed sets of values
- Use readonly for immutable properties

## NestJS Best Practices

### Controllers

- Keep controllers thin - delegate business logic to services
- Use DTOs for request validation
- Use guards for authentication and authorization
- Use interceptors for cross-cutting concerns
- Always use Swagger decorators

### Services

- Implement business logic in services
- Use dependency injection
- Keep services focused on single responsibility
- Use repositories for database access
- Handle errors appropriately

### DTOs (Data Transfer Objects)

- Use class-validator decorators
- Document with Swagger decorators
- Use transformation decorators when needed

Example:
```typescript
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  password: string;
}
```

## Testing Requirements

### Unit Tests

- Write unit tests for all services
- Mock external dependencies
- Test edge cases and error scenarios
- Use descriptive test names
- Aim for high code coverage

### Integration Tests

- Test API endpoints end-to-end
- Test with real database (using test containers or in-memory DB)
- Test authentication and authorization
- Test error scenarios

### Contract Tests

- **MANDATORY**: Every API endpoint must have a contract test validating response format
- Use JSON Schema validation
- Test both success and error responses
- Validate pagination structure for list endpoints
- Validate single resource structure for CRUD endpoints

## Documentation Requirements

### Code Documentation

- Document complex logic with comments
- Use JSDoc for public APIs
- Keep comments up-to-date

### API Documentation

- Use Swagger/OpenAPI decorators
- Document all endpoints
- Document request/response schemas
- Include examples in documentation
- Document error responses

### README and Guides

- Update relevant documentation when adding features
- Provide usage examples
- Document configuration options

## Security Best Practices

- Never commit secrets or credentials
- Use environment variables for configuration
- Validate and sanitize all input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Implement proper authentication and authorization
- Use CORS appropriately

## Database Guidelines

- Use Mongoose for MongoDB
- Define schemas with proper validation
- Use indexes for performance
- Handle connection errors
- Use transactions for multi-step operations
- Implement soft deletes when appropriate

## Git Commit Messages

- Use conventional commit format: `type(scope): message`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep messages concise and descriptive
- Reference issue numbers when applicable

## Review Checklist

Before submitting code, ensure:

- [ ] All API endpoints return standardized response envelope
- [ ] Response helper functions from `@shared/response` are used
- [ ] OpenAPI/Swagger documentation is updated
- [ ] Contract tests validate response format
- [ ] DTOs are properly validated
- [ ] Error handling uses standardized error codes
- [ ] Code follows TypeScript conventions
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No sensitive data in code or commits
- [ ] Code is formatted with Prettier
- [ ] ESLint passes without errors

## Additional Resources

- [API Response Format Documentation](../docs/API_RESPONSE_FORMAT.md)
- [Error Handling Documentation](../docs/ERROR_HANDLING.md)
- [Testing Documentation](../docs/TESTING.md)
- [NestJS Documentation](https://docs.nestjs.com/)
