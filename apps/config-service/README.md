# Config Service

A flexible configuration storage microservice for managing global and user-scoped settings in the Open ERP Backend.

## Overview

The Config Service provides a centralized way to store, retrieve, and manage dynamic configuration data in JSON format. It supports two scopes:

- **Global**: System-wide configurations accessible to all users
- **User**: User-specific configurations that can override or extend global settings

## Features

- ✅ Flexible JSON configuration storage (any shape)
- ✅ Global and user-scoped configurations
- ✅ Automatic versioning with increment on updates
- ✅ Audit metadata (createdBy, updatedBy, timestamps)
- ✅ Role-based access control (RBAC)
  - Global configs: System Admin only
  - User configs: Owner or System Admin
- ✅ Fallback mechanism (user → global)
- ✅ Rate limiting to prevent abuse
- ✅ Event emission for audit logging
- ✅ Input validation (name pattern, size limits)
- ✅ Comprehensive Swagger documentation

## API Endpoints

### Global Configurations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/v1/configs` | Create or update global config | System Admin |
| `GET` | `/v1/configs` | List all global configs | Authenticated |
| `GET` | `/v1/configs/:name` | Get specific global config | Authenticated |
| `PUT` | `/v1/configs/:name` | Update global config | System Admin |
| `PATCH` | `/v1/configs/:name` | Partially update global config | System Admin |
| `DELETE` | `/v1/configs/:name` | Delete global config | System Admin |

### User-Scoped Configurations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/v1/users/:userId/configs` | Create or update user config | Owner or Admin |
| `GET` | `/v1/users/:userId/configs` | List all user configs | Owner or Admin |
| `GET` | `/v1/users/:userId/configs/:name` | Get specific user config | Owner or Admin |
| `PUT` | `/v1/users/:userId/configs/:name` | Update user config | Owner or Admin |
| `PATCH` | `/v1/users/:userId/configs/:name` | Partially update user config | Owner or Admin |
| `DELETE` | `/v1/users/:userId/configs/:name` | Delete user config | Owner or Admin |

## Data Model

```typescript
interface Config {
  id: string;                    // Unique identifier
  name: string;                  // Config name (alphanumeric, hyphens, underscores)
  scope: 'global' | 'user';     // Configuration scope
  data: Record<string, any>;    // Flexible JSON data
  description?: string;          // Optional description
  version: number;               // Auto-incremented on updates
  ownerId?: string;             // User ID (for user-scoped configs)
  createdBy: string;            // User who created the config
  updatedBy: string;            // User who last updated the config
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}
```

## Usage Examples

### Create/Update Global Config

```bash
POST /v1/configs
Authorization: Bearer <system-admin-token>
Content-Type: application/json

{
  "name": "feature-flags",
  "data": {
    "darkModeEnabled": true,
    "newDashboard": false,
    "experimentalFeatures": ["ai-assistant", "advanced-charts"]
  },
  "description": "Global feature flags"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "feature-flags",
  "scope": "global",
  "data": {
    "darkModeEnabled": true,
    "newDashboard": false,
    "experimentalFeatures": ["ai-assistant", "advanced-charts"]
  },
  "description": "Global feature flags",
  "version": 1,
  "createdBy": "admin-user-id",
  "updatedBy": "admin-user-id",
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z"
}
```

### Get Global Config

```bash
GET /v1/configs/feature-flags
Authorization: Bearer <token>
```

### Create/Update User Config

```bash
POST /v1/users/user123/configs
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "name": "ui-preferences",
  "data": {
    "theme": "dark",
    "language": "vi",
    "notifications": {
      "email": true,
      "push": false
    }
  },
  "description": "User UI preferences"
}
```

### Get User Config with Fallback

```bash
GET /v1/users/user123/configs/feature-flags?fallback=true
Authorization: Bearer <user-token>
```

This will return the user's config if it exists, otherwise fall back to the global config.

### Update Config (Partial)

```bash
PATCH /v1/users/user123/configs/ui-preferences
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "data": {
    "theme": "light"
  }
}
```

This will update only the `data` field while preserving the description and incrementing the version.

## Authorization

### Global Configs
- **Create/Update/Delete**: Requires `SYSTEM_ADMIN` role
- **Read**: Any authenticated user with `config.read` permission

### User Configs
- **Create/Update/Delete**: User can manage their own configs, or System Admins can manage any user's configs
- **Read**: User can read their own configs, or System Admins can read any user's configs

## Validation Rules

### Name Pattern
- Must contain only alphanumeric characters, hyphens, and underscores
- Maximum length: 100 characters
- Pattern: `/^[a-zA-Z0-9_-]+$/`

### Data Size
- Maximum size: 100 KB (102,400 bytes)
- Validated on create and update operations

### Description
- Optional field
- Maximum length: 500 characters

## Rate Limiting

- **20 requests per minute** per IP address
- Applied to all write operations (POST, PUT, PATCH, DELETE)
- Read operations (GET) are also rate-limited for consistency

## Event Emission

The service emits audit events to RabbitMQ for the following operations:

- `config.global.upserted` - When a global config is created or updated
- `config.global.updated` - When a global config is updated
- `config.global.deleted` - When a global config is deleted
- `config.user.upserted` - When a user config is created or updated
- `config.user.updated` - When a user config is updated
- `config.user.deleted` - When a user config is deleted

Event payload:
```json
{
  "config": { /* config object */ },
  "userId": "user-id-who-performed-action",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

## Database Indexes

The following indexes are created for efficient queries:

1. Compound unique index: `{ name: 1, scope: 1, ownerId: 1 }`
2. Query index: `{ name: 1, scope: 1 }`
3. Query index: `{ ownerId: 1, scope: 1 }`
4. Temporal index: `{ updatedAt: -1 }`

## Error Handling

All errors follow the standard error response format:

```json
{
  "errorCode": "CONFIG_NOT_FOUND",
  "message": "Global config 'feature-flags' not found",
  "correlationId": "uuid-correlation-id",
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

Common error codes:
- `CONFIG_NOT_FOUND` - Requested config does not exist
- `VALIDATION_ERROR` - Invalid input data
- `AUTH_INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `AUTH_FORBIDDEN_CROSS_TENANT` - Attempting cross-tenant access

## Environment Variables

```bash
# Config service port
CONFIG_SERVICE_PORT=3004

# MongoDB connection (shared with other services)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=open_erp

# RabbitMQ connection (shared with other services)
RABBITMQ_URL=amqp://localhost:5672

# Enable Swagger documentation
ENABLE_SWAGGER=true
```

## Running the Service

### Development Mode
```bash
npm run start:config-service:dev
```

### Production Mode
```bash
npm run build:config-service
npm run start:config-service
```

### With Docker
```bash
docker-compose up config-service
```

## Testing

Run tests:
```bash
npm test -- apps/config-service
```

Run integration tests:
```bash
npm run test:e2e -- apps/config-service
```

## Use Cases

### 1. Feature Flags
Store global feature flags that can be toggled without code deployment:

```json
{
  "name": "feature-flags",
  "data": {
    "newUIEnabled": true,
    "betaFeatures": false,
    "maintenanceMode": false
  }
}
```

### 2. User Preferences
Store user-specific UI preferences:

```json
{
  "name": "ui-preferences",
  "data": {
    "theme": "dark",
    "language": "vi",
    "sidebar": "collapsed",
    "defaultView": "dashboard"
  }
}
```

### 3. Integration Settings
Store third-party integration configurations:

```json
{
  "name": "payment-gateway",
  "data": {
    "provider": "stripe",
    "webhookUrl": "https://api.example.com/webhooks",
    "features": ["recurring", "refunds"]
  }
}
```

### 4. Widget Configurations
Store dashboard widget layouts:

```json
{
  "name": "dashboard-layout",
  "data": {
    "widgets": [
      { "id": "sales-chart", "position": "top-left", "size": "large" },
      { "id": "notifications", "position": "top-right", "size": "small" }
    ]
  }
}
```

## Future Enhancements

- [ ] Redis caching with TTL for frequently accessed configs
- [ ] JSON Schema validation for config data
- [ ] Config versioning history (view previous versions)
- [ ] Bulk import/export of configs
- [ ] Config inheritance (tenant → global)
- [ ] Encryption at rest for sensitive configs
- [ ] Admin UI for managing configs
- [ ] Config change webhooks for real-time notifications

## Architecture Notes

### Design Decisions

1. **Upsert Semantics**: POST endpoints use upsert logic (create or update) to simplify client usage
2. **Versioning**: Automatic version increment on updates for change tracking
3. **Fallback**: Optional fallback from user to global scope for flexible configuration inheritance
4. **Audit Events**: All mutations emit events for audit logging and downstream processing
5. **Rate Limiting**: Applied to prevent abuse and ensure system stability

### Performance Considerations

- Indexed queries ensure fast lookups even with large config collections
- Config data size limit (100 KB) prevents excessive memory usage
- Pagination support (limit parameter) for list endpoints
- Sparse indexes on ownerId for efficient user-scoped queries

## Support

For issues or questions about the Config Service, please refer to:
- API Documentation: http://localhost:3004/docs (when ENABLE_SWAGGER=true)
- Project Documentation: /docs
- Issue Tracker: GitHub Issues
