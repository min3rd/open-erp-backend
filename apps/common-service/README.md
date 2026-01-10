# Common Service

Common Service is a microservice for managing master data (provinces, districts, wards) and user addresses in the Open ERP backend system.

## Features

### Master Data Management
- **Provinces**: CRUD operations for province master data
- **Districts**: CRUD operations for district master data
- **Wards**: CRUD operations for ward/commune master data
- Support for versioning (legacy and current administrative divisions)
- Search and filtering capabilities
- Hierarchical queries (e.g., get districts by province)

### Address Management
- **User Addresses**: CRUD operations for user-input addresses
- Scope-based access control (global for personal, organization for company)
- Validation against master data (province/district/ward codes)
- Snapshot storage to preserve historical accuracy
- Soft delete functionality
- Support for multiple address types (shipping, billing, warehouse, etc.)

## API Endpoints

### Master Data (Public Read, Admin Write)

#### Provinces
- `GET /provinces` - List all provinces (with pagination and filters)
- `GET /provinces/:code` - Get province by code
- `GET /provinces/:code/districts` - Get districts for a province
- `POST /provinces` - Create province (Admin only)
- `PATCH /provinces/:code` - Update province (Admin only)
- `DELETE /provinces/:code` - Delete province (Admin only)

#### Districts
- `GET /districts` - List all districts (with pagination and filters)
- `GET /districts/:code` - Get district by code
- `POST /districts` - Create district (Admin only)
- `PATCH /districts/:code` - Update district (Admin only)
- `DELETE /districts/:code` - Delete district (Admin only)

#### Wards
- `GET /wards` - List all wards (with pagination and filters)
- `GET /wards/:code` - Get ward by code
- `POST /wards` - Create ward (Admin only)
- `PATCH /wards/:code` - Update ward (Admin only)
- `DELETE /wards/:code` - Delete ward (Admin only)

### Addresses (Authentication Required)
- `GET /addresses` - List addresses (with scope filtering)
- `GET /addresses/:id` - Get address by ID
- `POST /addresses` - Create new address
- `PATCH /addresses/:id` - Update address
- `DELETE /addresses/:id` - Soft delete address

### Health Check
- `GET /health` - Service health check

## Configuration

### Environment Variables

```bash
COMMON_SERVICE_PORT=3006
MONGODB_URI=mongodb://localhost:27017
MONGODB_USER=erp_user
MONGODB_PASS=erp_password
MONGODB_DB=open_erp
JWT_SECRET=your-secret-key
```

## Running the Service

### Development Mode

```bash
# Start the service in watch mode
npm run start:common-service:dev
```

### Production Mode

```bash
# Build the service
npm run build:common-service

# Start the service
npm run start:common-service
```

### Using Docker

```bash
# Build and start with docker-compose
docker compose up common-service --build

# Or start all services
docker compose up --build
```

## Seeding Data

The service uses shared schemas and seed scripts. To populate provinces and wards:

```bash
npm run db:seed:provinces-wards
```

This will seed:
- 63 legacy provinces (version 1.0)
- Current provinces (version 2.0)
- Sample wards for major cities

## Data Model

### Province Schema
```typescript
{
  code: string;          // Unique province code (e.g., "P01", "01")
  name: string;          // Province name in Vietnamese
  nameEn?: string;       // Province name in English
  region?: string;       // Region (northern, central, southern, highland)
  sortOrder?: number;    // Display order
  version?: string;      // Data version (1.0, 2.0)
  isLegacy?: boolean;    // Legacy flag for historical data
}
```

### District Schema
```typescript
{
  code: string;          // Unique district code
  name: string;          // District name in Vietnamese
  nameEn?: string;       // District name in English
  provinceCode: string;  // Parent province code
  sortOrder?: number;    // Display order
  version?: string;      // Data version
  isLegacy?: boolean;    // Legacy flag
}
```

### Ward Schema
```typescript
{
  code: string;          // Unique ward code
  name: string;          // Ward name in Vietnamese
  nameEn?: string;       // Ward name in English
  provinceCode: string;  // Parent province code
  districtCode?: string; // Parent district code
  sortOrder?: number;    // Display order
  version?: string;      // Data version
  isLegacy?: boolean;    // Legacy flag
}
```

### Address Schema
```typescript
{
  scope: 'global' | 'organization';
  type: 'shipping' | 'billing' | 'warehouse' | 'office' | 'personal' | 'other';
  userId?: ObjectId;
  organizationId?: ObjectId;
  addressLine1: string;
  addressLine2?: string;
  province: {             // Snapshot
    code: string;
    name: string;
    nameEn?: string;
  };
  district?: {            // Snapshot
    code: string;
    name: string;
    nameEn?: string;
  };
  ward?: {                // Snapshot
    code: string;
    name: string;
    nameEn?: string;
  };
  postalCode?: string;
  countryCode?: string;
  contactName?: string;
  contactPhone?: string;
  location?: {            // GeoJSON
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isDefault?: boolean;
  label?: string;
  notes?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
}
```

## Authentication & Authorization

- **Master Data Read**: Public (no authentication required)
- **Master Data Write**: Requires authentication + ADMIN or SYSTEM_ADMIN role
- **Addresses**: All operations require authentication
  - Users can only access their own addresses (scope=global, userId matches)
  - Organization members can access organization addresses (with proper permissions)

## API Documentation

Swagger UI is available at: `http://localhost:3006/api`

OpenAPI JSON specification: `http://localhost:3006/api-json`

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:cov
```

## Architecture

The service follows the NestJS microservice architecture pattern:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and validation
- **Repositories**: Handle database operations
- **DTOs**: Define data transfer objects with validation
- **Schemas**: MongoDB/Mongoose schemas (shared across services)

## Integration with Other Services

The common-service is designed to be consumed by other microservices:

- **Inventory Service**: Use addresses for warehouse locations
- **Organization Service**: Use addresses for organization offices
- **Order Service**: Use addresses for shipping and billing

All services should call common-service APIs instead of duplicating master data logic.

## Caching (Future Enhancement)

For production deployments, consider implementing:
- Redis caching for frequently accessed master data
- ETag/Last-Modified headers for client-side caching
- Cache invalidation on master data updates

## Performance Considerations

- Indexes are created on frequently queried fields (code, provinceCode, districtCode)
- Text search indexes for name/nameEn fields
- Compound indexes for hierarchical queries
- Pagination support for large result sets

## Monitoring

The service exposes metrics for:
- Request counts and latencies
- Database query performance
- Error rates

Health check endpoint: `GET /health`
