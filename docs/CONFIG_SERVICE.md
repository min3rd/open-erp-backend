# Config Service API

## Overview

The Config Service is a flexible configuration storage microservice that manages global and user-scoped settings. It provides a centralized way to store, retrieve, and manage dynamic configuration data in JSON format.

For detailed information, see the [Config Service README](../apps/config-service/README.md).

## Quick Links

- **Service Port**: 3004 (default)
- **API Documentation**: http://localhost:3004/docs (when running with ENABLE_SWAGGER=true)
- **OpenAPI JSON**: http://localhost:3004/api-docs.json
- **Health Check**: http://localhost:3004/health

## Key Features

- ✅ Flexible JSON configuration storage (any shape)
- ✅ Global and user-scoped configurations
- ✅ Automatic versioning with increment on updates
- ✅ Audit metadata (createdBy, updatedBy, timestamps)
- ✅ Role-based access control (RBAC)
- ✅ Fallback mechanism (user → global)
- ✅ Rate limiting to prevent abuse
- ✅ Event emission for audit logging
- ✅ Input validation (name pattern, size limits)

## Common Use Cases

1. **Feature Flags**: Toggle features without code deployment
2. **User Preferences**: Store user-specific UI settings
3. **Integration Settings**: Manage third-party service configurations
4. **Widget Configurations**: Store dashboard layouts and widget settings

## Quick Start

### Start the Service

```bash
# Development mode
npm run start:config-service:dev

# Production mode
npm run build:config-service
npm run start:config-service
```

### Create a Global Config

```bash
curl -X POST http://localhost:3004/v1/configs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <system-admin-token>" \
  -d '{
    "name": "feature-flags",
    "data": {
      "darkModeEnabled": true,
      "newDashboard": false
    },
    "description": "Global feature flags"
  }'
```

### Get a User Config with Fallback

```bash
curl -X GET "http://localhost:3004/v1/users/user123/configs/feature-flags?fallback=true" \
  -H "Authorization: Bearer <user-token>"
```

## API Endpoints

### Global Configurations

- `POST /v1/configs` - Create or update global config (System Admin)
- `GET /v1/configs` - List all global configs (Authenticated)
- `GET /v1/configs/:name` - Get specific global config (Authenticated)
- `PUT /v1/configs/:name` - Update global config (System Admin)
- `PATCH /v1/configs/:name` - Partially update global config (System Admin)
- `DELETE /v1/configs/:name` - Delete global config (System Admin)

### User-Scoped Configurations

- `POST /v1/users/:userId/configs` - Create or update user config (Owner or Admin)
- `GET /v1/users/:userId/configs` - List all user configs (Owner or Admin)
- `GET /v1/users/:userId/configs/:name` - Get specific user config (Owner or Admin)
- `PUT /v1/users/:userId/configs/:name` - Update user config (Owner or Admin)
- `PATCH /v1/users/:userId/configs/:name` - Partially update user config (Owner or Admin)
- `DELETE /v1/users/:userId/configs/:name` - Delete user config (Owner or Admin)

## Authorization

### Global Configs
- **Create/Update/Delete**: Requires `SYSTEM_ADMIN` role
- **Read**: Any authenticated user with `config.read` permission

### User Configs
- **Create/Update/Delete**: User can manage their own configs, or System Admins can manage any user's configs
- **Read**: User can read their own configs, or System Admins can read any user's configs

## Configuration Options

### Environment Variables

```bash
# Service port
CONFIG_SERVICE_PORT=3004

# MongoDB connection (shared)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=open_erp

# RabbitMQ connection (shared)
RABBITMQ_URL=amqp://localhost:5672

# Enable Swagger
ENABLE_SWAGGER=true
```

### Validation Rules

- **Name Pattern**: Alphanumeric, hyphens, underscores only (max 100 chars)
- **Data Size**: Maximum 100 KB (102,400 bytes)
- **Description**: Optional, maximum 500 characters

### Rate Limiting

- **20 requests per minute** per IP address
- Applied to all write operations

## Event Emission

The service emits audit events to RabbitMQ:

- `config.global.upserted` - Global config created/updated
- `config.global.updated` - Global config updated
- `config.global.deleted` - Global config deleted
- `config.user.upserted` - User config created/updated
- `config.user.updated` - User config updated
- `config.user.deleted` - User config deleted

## Integration

### Using with Other Services

```typescript
// Subscribe to config change events
await rabbitMQClient.subscribe(
  'my-service-queue',
  RABBITMQ_EXCHANGES.EVENTS,
  'config.*',
  async (message) => {
    const { config, userId, timestamp } = message.data;
    // Handle config change
    console.log(`Config ${config.name} changed by ${userId}`);
  }
);
```

### Fetching Configs from Client

```typescript
// Get user config with fallback to global
const response = await fetch(
  '/v1/users/user123/configs/feature-flags?fallback=true',
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
const config = await response.json();
```

## Testing

```bash
# Run unit tests
npm test -- apps/config-service

# Run integration tests
npm run test:e2e -- apps/config-service
```

## Related Documentation

- [Main README](../README.md)
- [Microservices Architecture](./MICROSERVICES.md)
- [RBAC Authorization](./RBAC_AUTHORIZATION.md)
- [MongoDB Configuration](./MONGODB.md)
- [Error Handling](./ERROR_HANDLING.md)
