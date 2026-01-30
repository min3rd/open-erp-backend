# User Audit Log APIs Implementation Summary

## Overview
This document describes the implementation of User Audit Log APIs that enable administrators to track user activities for security and compliance purposes.

## Features Implemented

### 1. API Endpoints

#### GET /admin/users/:identifier/audit-logs
List audit logs for a specific user with comprehensive filtering and search capabilities.

**Parameters:**
- `identifier` (path): User ID, username, or email
- `page` (query): Page number (default: 1)
- `limit` (query): Items per page (default: 20)
- `search` (query): Search term for full-text search on action, resource, and description
- `sortBy` (query): Sort field and order (default: "createdAt:desc")
  - Format: `field:order`
  - Allowed fields: `createdAt`, `action`, `status`
  - Allowed orders: `asc`, `desc`
  - Validated with regex pattern
- `startDate` (query): Filter by start date (ISO 8601)
- `endDate` (query): Filter by end date (ISO 8601)
- `action` (query): Filter by action type (enum validated against UserAuditEventType)
- `resource` (query): Filter by resource name
- `status` (query): Filter by status (success, failure, pending)

**Response:**
- Paginated list of audit logs
- Basic log info: `id`, `action`, `resource`, `timestamp`, `ipAddress`, `status`, `description`
- Standard API response envelope format

**Permissions Required:**
- `MANAGE_USERS_AND_ORGS` (global) OR `MANAGE_ORG_USERS` (global)

#### GET /admin/users/audit-logs/:id
Get detailed information for a specific audit log entry.

**Parameters:**
- `id` (path): Audit log ID

**Response:**
- Detailed log information including:
  - All basic fields (id, action, resource, timestamp, ipAddress, status, description)
  - `payload`: Full request/change payload (sanitized if sensitive)
  - `userAgent`: Detailed user agent string
  - `metadata`: Any additional context
  - `performedBy`: User ID who performed the action (for admin actions)
  - `userId`: User ID being audited
- Standard API response envelope format with mode="get"

**Permissions Required:**
- `MANAGE_USERS_AND_ORGS` (global) OR `MANAGE_ORG_USERS` (global)

**Error Responses:**
- 404: User not found (USER_NOT_FOUND) or Audit log not found (AUDIT_LOG_NOT_FOUND)
- 403: Insufficient permissions (AUTH_INSUFFICIENT_PERMISSIONS)

### 2. Database Schema

#### UserAuditEvent Collection
```typescript
{
  action: UserAuditEventType,      // Required, indexed
  userId: ObjectId,                 // Required, indexed (user being audited)
  performedBy?: ObjectId,           // Optional, indexed (who performed the action)
  resource: string,                 // Required, indexed
  payload?: any,                    // Optional (event data)
  description?: string,             // Optional (max 500 chars)
  ipAddress?: string,               // Optional, indexed
  userAgent?: string,               // Optional
  status: string,                   // success|failure|pending, indexed
  metadata?: Map<string, any>,      // Optional
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-generated
}
```

#### Indexes
1. **Compound Indexes:**
   - `{ userId: 1, createdAt: -1 }` - Primary query pattern
   - `{ action: 1, createdAt: -1 }` - Filter by action type
   - `{ performedBy: 1, createdAt: -1 }` - Track who performed actions
   - `{ userId: 1, action: 1 }` - User-specific action filtering
   - `{ userId: 1, status: 1 }` - User-specific status filtering
   - `{ resource: 1, createdAt: -1 }` - Resource-based queries

2. **Text Index:**
   - Fields: `action`, `resource`, `description`
   - Name: `user_audit_events_text_search`
   - Enables full-text search

3. **TTL Index:**
   - Field: `createdAt`
   - TTL: 63072000 seconds (2 years)
   - Auto-deletes old audit logs

#### UserAuditEventType Enum
```typescript
// Authentication events
USER_LOGIN, USER_LOGOUT, USER_LOGIN_FAILED, USER_SESSION_EXPIRED

// Profile management
USER_CREATED, USER_UPDATED, USER_DELETED, USER_PROFILE_UPDATED,
USER_EMAIL_CHANGED, USER_PASSWORD_CHANGED, USER_PASSWORD_RESET,
USER_PASSWORD_RESET_ADMIN

// Account status
USER_BLOCKED, USER_UNBLOCKED, USER_ACTIVATED, USER_DEACTIVATED

// Session management
USER_SESSIONS_REVOKED, USER_SESSIONS_REVOKED_ADMIN

// Role and permissions
USER_ROLE_GRANTED, USER_ROLE_REVOKED, USER_PERMISSION_GRANTED,
USER_PERMISSION_REVOKED

// Organization membership
USER_ORGANIZATION_JOINED, USER_ORGANIZATION_LEFT, USER_ORGANIZATION_REMOVED
```

### 3. Architecture

#### Components

**Schema** (`libs/shared/schemas/user-audit-event.schema.ts`)
- Mongoose schema definition
- Enum definitions for action types
- Index configurations
- Virtual fields and transformations

**Repository** (`apps/user/src/repositories/user-audit-event.repository.ts`)
- `create()`: Create new audit event
- `findById()`: Get audit event by ID
- `findByUserId()`: Get audit events for a user with filtering and pagination
- `findByAction()`: Get audit events by action type
- `count()`: Count audit events with filters

**Service** (`apps/user/src/services/user-audit.service.ts`)
- `logEvent()`: Log a user audit event (error-safe, won't break business logic)
- `getUserAuditLogs()`: Get user audit logs with options
- `getAuditLogById()`: Get audit log by ID
- `getAuditLogsByAction()`: Get audit logs by action type
- `countUserAuditLogs()`: Count user audit logs

**Controller** (`apps/user/src/controllers/audit.controller.ts`)
- `listUserAuditLogs()`: GET /admin/users/:identifier/audit-logs
- `getAuditLogDetail()`: GET /admin/users/audit-logs/:id
- Proper error handling with standardized responses
- Permission guards applied

**DTOs** (`apps/user/src/dto/user-audit.dto.ts`)
- `ListUserAuditLogsQueryDto`: Request validation for list endpoint
- `UserAuditLogBasicDto`: Basic log information
- `UserAuditLogDetailDto`: Detailed log information
- Comprehensive validation decorators

**Migration** (`migrations/20260130000001-create-user-audit-events-collection.js`)
- Creates collection with schema validation
- Creates all indexes
- Rollback support

### 4. Security Features

1. **Permission-Based Access Control:**
   - Endpoints protected by JwtAuthGuard and PermissionsGuard
   - Requires global MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS permissions

2. **Input Validation:**
   - All query parameters validated with class-validator
   - sortBy parameter validated with regex pattern
   - action parameter validated against enum
   - Status parameter validated against allowed values

3. **Error Handling:**
   - 404 responses for not found resources
   - 403 responses for insufficient permissions
   - Standardized error codes (USER_NOT_FOUND, AUDIT_LOG_NOT_FOUND)

4. **Data Protection:**
   - Payload can be sanitized if sensitive
   - TTL index ensures old data is automatically removed
   - IP addresses and user agents tracked for security auditing

### 5. Code Quality

1. **Standards Compliance:**
   - Follows existing patterns from OrganizationAuditEvent implementation
   - Uses standardized response helpers (paginated, fetched, error)
   - Proper TypeScript types and interfaces
   - Comprehensive OpenAPI/Swagger documentation

2. **Testing:**
   - Contract tests validate response envelope format
   - Tests cover success cases, error cases, and edge cases
   - Response format validated against JSON schema

3. **Documentation:**
   - Inline code comments for complex logic
   - OpenAPI/Swagger documentation for all endpoints
   - Implementation summary (this document)

4. **Security:**
   - No security vulnerabilities detected by CodeQL
   - Error-safe audit logging (failures don't break business logic)
   - Proper input validation and sanitization

### 6. Integration

#### Module Updates
The `UserModule` (`apps/user/src/user.module.ts`) was updated to include:
- `UserAuditEvent` schema in MongooseModule.forFeature
- `AuditController` in controllers array
- `UserAuditService` in providers array
- `UserAuditEventRepository` in providers array

#### Schema Updates
The shared schemas index (`libs/shared/schemas/index.ts`) was updated to export:
- `UserAuditEvent`
- `UserAuditEventDocument`
- `UserAuditEventType`
- `UserAuditEventSchema`

#### Error Codes
New error code added to `libs/shared/errors/error-codes.ts`:
- `AUDIT_LOG_NOT_FOUND = 'AUDIT_0001'`

## Usage Examples

### List User Audit Logs
```bash
GET /admin/users/john_doe/audit-logs?page=1&limit=20&sortBy=createdAt:desc
```

Response:
```json
{
  "success": true,
  "message": "User audit logs retrieved successfully",
  "error": null,
  "data": {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "action": "user.password.changed",
        "resource": "user",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "status": "success",
        "description": "User password changed"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Search Audit Logs
```bash
GET /admin/users/john@example.com/audit-logs?search=password&action=user.password.changed
```

### Filter by Date Range
```bash
GET /admin/users/507f1f77bcf86cd799439011/audit-logs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

### Get Audit Log Detail
```bash
GET /admin/users/audit-logs/507f1f77bcf86cd799439011
```

Response:
```json
{
  "success": true,
  "message": "Audit log retrieved successfully",
  "error": null,
  "data": {
    "mode": "get",
    "item": {
      "id": "507f1f77bcf86cd799439011",
      "action": "user.password.changed",
      "resource": "user",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "ipAddress": "192.168.1.1",
      "status": "success",
      "description": "User password changed",
      "payload": {
        "passwordChangedAt": "2024-01-15T10:30:00.000Z"
      },
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "metadata": {
        "requestId": "req-123",
        "sessionId": "sess-456"
      },
      "userId": "507f1f77bcf86cd799439011"
    }
  }
}
```

## Testing

### Running Tests
```bash
# Run contract tests
npm test -- apps/user/test/controllers/audit.controller.contract.spec.ts

# Run all user service tests
npm test -- apps/user/test/
```

### Manual Testing
1. Start the development environment:
   ```bash
   npm run docker:dev:up
   npm run start:user:dev
   ```

2. Get an admin access token (user with MANAGE_USERS_AND_ORGS permission)

3. Test the endpoints:
   ```bash
   # List user audit logs
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/admin/users/john_doe/audit-logs

   # Get audit log detail
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/admin/users/audit-logs/507f1f77bcf86cd799439011
   ```

## Future Enhancements

1. **Export Functionality:**
   - Add endpoint to export audit logs to CSV/Excel
   - Support for bulk export with date range

2. **Real-time Notifications:**
   - WebSocket/SSE for real-time audit log updates
   - Alert on suspicious activities

3. **Advanced Analytics:**
   - Aggregate statistics (login patterns, failure rates)
   - Anomaly detection
   - Visualization endpoints

4. **Audit Log Retention Policies:**
   - Configurable TTL per organization
   - Archive to cold storage before deletion

5. **Integration with Other Services:**
   - Automatic audit logging for all user actions
   - Integration with AdminUserService for automatic logging

## Migration Guide

### Database Migration
```bash
# Run the migration
npm run db:migrate

# Check status
npm run db:migrate:status

# Rollback if needed
npm run db:migrate:down
```

### Backward Compatibility
- No breaking changes to existing APIs
- New endpoints are isolated under `/admin/users` path
- Existing audit logging (OrganizationAuditEvent) continues to work

## Conclusion

The User Audit Log APIs provide a comprehensive solution for tracking user activities with:
- Full-featured querying and filtering capabilities
- Proper security and permission controls
- Standardized API responses
- Efficient database indexing
- Automatic data cleanup
- High code quality and test coverage

The implementation follows existing patterns in the codebase and integrates seamlessly with the current architecture.
