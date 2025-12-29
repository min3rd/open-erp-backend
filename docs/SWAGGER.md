# Swagger/OpenAPI Documentation

This guide explains how to use and configure the OpenAPI/Swagger documentation system in the Open ERP Backend microservices architecture.

## Overview

The system consists of:
- **Individual Services**: Each microservice exposes its own OpenAPI specification at `/api-docs.json` and optionally a Swagger UI at `/docs`
- **Docs Aggregator**: A central service that provides a unified UI to browse documentation from all microservices

## Architecture

```
┌─────────────────────────────────────────┐
│     Docs Aggregator (Port 3000)        │
│   http://localhost:3000/docs            │
│                                         │
│  - Service Selection UI                │
│  - Fetches specs from services         │
│  - Caching & refresh                   │
│  - Auth support for protected specs    │
└─────────────────────────────────────────┘
              │
              ├──────────────────┬──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  Auth Service   │ │  User Service   │ │ Notification    │
    │   Port 3001     │ │   Port 3002     │ │   Port 3003     │
    │                 │ │                 │ │                 │
    │ /api-docs.json  │ │ /api-docs.json  │ │ /api-docs.json  │
    │ /docs           │ │ /docs           │ │ /docs           │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Quick Start

### 1. Local Development

```bash
# Set environment variable to enable Swagger
export ENABLE_SWAGGER=true

# Start all services
npm run start:auth:dev
npm run start:user:dev
npm run start:notification:dev

# Start docs aggregator
npm run start:dev
```

Access the aggregated documentation at: http://localhost:3000/docs

Individual service documentation:
- Auth Service: http://localhost:3001/docs
- User Service: http://localhost:3002/docs
- Notification Service: http://localhost:3003/docs

### 2. Docker Deployment

```bash
# Set ENABLE_SWAGGER in your .env file or export it
export ENABLE_SWAGGER=true

# Start all services with Docker Compose
docker compose up --build

# Or in detached mode
docker compose up -d --build
```

Access the aggregated documentation at: http://localhost:3000/docs

## Configuration

### Service-Side Configuration

Each microservice needs the `ENABLE_SWAGGER` environment variable set to `true` to expose OpenAPI documentation.

**Environment Variables:**
```bash
ENABLE_SWAGGER=true  # Enable Swagger documentation (default: false)
```

When enabled, each service exposes:
- `/api-docs.json` - OpenAPI 3.0 specification in JSON format
- `/docs` - Swagger UI for interactive API exploration

**Service Metadata:**
Each service includes metadata in its OpenAPI spec:
- `info.title` - Service name (e.g., "Auth Service API")
- `info.version` - API version (e.g., "1.0.0")
- `info.description` - Service description
- `x-service-name` - Service identifier (e.g., "auth-service")

### Aggregator Configuration

The docs aggregator service (port 3000) requires the `SWAGGER_AGGREGATOR_SERVICES` environment variable.

**Environment Variables:**

```bash
PORT=3000  # Aggregator service port

# JSON array of service configurations
SWAGGER_AGGREGATOR_SERVICES='[
  {
    "name": "Auth Service",
    "url": "http://localhost:3001/api-docs.json"
  },
  {
    "name": "User Service",
    "url": "http://localhost:3002/api-docs.json"
  },
  {
    "name": "Notification Service",
    "url": "http://localhost:3003/api-docs.json"
  }
]'
```

**For Docker Deployment:**
```bash
SWAGGER_AGGREGATOR_SERVICES='[
  {
    "name": "Auth Service",
    "url": "http://auth-service:3001/api-docs.json"
  },
  {
    "name": "User Service",
    "url": "http://user-service:3002/api-docs.json"
  },
  {
    "name": "Notification Service",
    "url": "http://notification-service:3003/api-docs.json"
  }
]'
```

### Authentication for Protected Specs

If your services require authentication to access the `/api-docs.json` endpoint, you can configure credentials in the aggregator:

**Basic Authentication:**
```json
{
  "name": "Protected Service",
  "url": "http://service:3001/api-docs.json",
  "auth": {
    "type": "basic",
    "credentials": "dXNlcm5hbWU6cGFzc3dvcmQ="  // Base64 encoded "username:password"
  }
}
```

**Bearer Token:**
```json
{
  "name": "Protected Service",
  "url": "http://service:3001/api-docs.json",
  "auth": {
    "type": "bearer",
    "credentials": "your-bearer-token-here"
  }
}
```

## Adding Swagger to a New Service

### 1. Install Dependencies (Already Done)

The `@nestjs/swagger` package is already installed in the project.

### 2. Update Service Main File

Add Swagger setup to your service's `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { YourModule } from './your.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('YourService');
  
  const app = await NestFactory.create(YourModule);
  
  // Setup Swagger/OpenAPI
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Your Service API')
      .setDescription('Your service description')
      .setVersion('1.0.0')
      .addTag('your-tag')
      .build();
    
    // Add custom property for service identification
    config['x-service-name'] = 'your-service';
    
    const document = SwaggerModule.createDocument(app, config);
    
    // Serve Swagger UI at /docs
    SwaggerModule.setup('docs', app, document);
    
    // Serve OpenAPI JSON at /api-docs.json
    app.getHttpAdapter().get('/api-docs.json', (req, res) => {
      res.json(document);
    });
    
    logger.log('Swagger documentation enabled at /docs and /api-docs.json');
  }
  
  const port = process.env.YOUR_SERVICE_PORT || 3004;
  await app.listen(port);
  
  logger.log(\`Your service is running on port \${port}\`);
}

bootstrap();
```

### 3. Add API Decorators to Controllers

Decorate your controllers and endpoints with Swagger decorators:

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('your-feature')
@Controller('your-path')
export class YourController {
  @Get()
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, description: 'Returns all items' })
  async findAll() {
    // ...
  }

  @Post()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createDto: CreateDto) {
    // ...
  }
}
```

### 4. Add API Properties to DTOs

Document your DTOs with `@ApiProperty`:

```typescript
import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  name: string;
}
```

### 5. Register in Aggregator

Add your new service to `SWAGGER_AGGREGATOR_SERVICES`:

```json
{
  "name": "Your Service",
  "url": "http://localhost:3004/api-docs.json"
}
```

## Features

### 1. Service Selection
The aggregator UI provides a dropdown to select which service's documentation to view.

### 2. Caching
The aggregator caches fetched specifications for 5 minutes to reduce load on services.

### 3. Manual Refresh
Click the "↻ Refresh" button to force reload the current service's specification.

### 4. Error Handling
If a service is unavailable or doesn't have Swagger enabled, the UI displays helpful error messages with troubleshooting tips.

### 5. No Merging
Each service's specification is displayed independently. The aggregator does NOT merge specs into a single combined file.

## Security Best Practices

### Production Deployment

⚠️ **Important**: OpenAPI documentation can expose sensitive API details. Follow these security practices:

### 1. Disable in Production (Recommended)
```bash
ENABLE_SWAGGER=false  # Disable for production
```

### 2. Protect with Authentication
If you need docs in production, protect them with:

**Option A: BasicAuth (Simple)**
Use a reverse proxy (nginx, Traefik) to add BasicAuth to `/docs` and `/api-docs.json` endpoints.

**Option B: IP Allowlist**
Restrict access to specific IP ranges using firewall rules or reverse proxy configuration.

**Option C: OAuth/OIDC**
Integrate with your authentication system to require login before accessing docs.

### 3. Sanitize Examples
Never include real credentials, tokens, or sensitive data in API examples:

```typescript
@ApiProperty({
  description: 'API key',
  example: 'your-api-key-here',  // ✅ Generic example
  // NOT: example: 'sk_live_51H...'  // ❌ Real API key
})
apiKey: string;
```

### 4. Environment-Specific Configuration

**.env.development:**
```bash
ENABLE_SWAGGER=true
```

**.env.production:**
```bash
ENABLE_SWAGGER=false
```

## Troubleshooting

### Service Documentation Not Loading

**Problem**: "Failed to load API specification" error in aggregator

**Solutions**:
1. Check if the service is running: `curl http://localhost:3001/health`
2. Verify `ENABLE_SWAGGER=true` is set for the service
3. Check the service URL in `SWAGGER_AGGREGATOR_SERVICES` is correct
4. For Docker: use service names (e.g., `auth-service`) not `localhost`
5. Check browser console for detailed error messages

### Swagger UI Not Appearing

**Problem**: `/docs` endpoint returns 404

**Solutions**:
1. Ensure `ENABLE_SWAGGER=true` environment variable is set
2. Restart the service after setting the variable
3. Check service logs for Swagger initialization messages
4. Verify `@nestjs/swagger` is installed: `npm list @nestjs/swagger`

### Outdated Specification

**Problem**: Changes to API not reflected in docs

**Solutions**:
1. Click the "↻ Refresh" button in aggregator UI
2. Restart the service to regenerate the OpenAPI spec
3. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Docker Services Can't Communicate

**Problem**: Aggregator can't fetch specs from services in Docker

**Solutions**:
1. Use Docker service names in URLs (not `localhost`):
   ```json
   {"name": "Auth", "url": "http://auth-service:3001/api-docs.json"}
   ```
2. Ensure all services are on the same Docker network
3. Check `docker compose logs` for connectivity errors

## Testing

### Validate OpenAPI Schema

You can validate the OpenAPI specs using online validators or CLI tools:

```bash
# Fetch the spec
curl http://localhost:3001/api-docs.json > auth-spec.json

# Validate using swagger-cli (install: npm install -g @apidevtools/swagger-cli)
swagger-cli validate auth-spec.json
```

### CI/CD Integration

Add OpenAPI validation to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate OpenAPI Specs
  run: |
    npm run start:auth:dev &
    npm run start:user:dev &
    npm run start:notification:dev &
    sleep 10
    curl http://localhost:3001/api-docs.json | npx @apidevtools/swagger-cli validate /dev/stdin
    curl http://localhost:3002/api-docs.json | npx @apidevtools/swagger-cli validate /dev/stdin
    curl http://localhost:3003/api-docs.json | npx @apidevtools/swagger-cli validate /dev/stdin
```

## Additional Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service logs: `docker compose logs -f [service-name]`
3. Open an issue in the project repository
