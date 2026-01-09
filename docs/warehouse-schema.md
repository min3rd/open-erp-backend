# Warehouse Schema Documentation

## Overview

The Warehouse schema provides a comprehensive data model for managing warehouse facilities in the ERP system. It supports multi-tenant architecture, geospatial queries, and integration with Vietnam's administrative divisions (provinces and wards).

## Schema Structure

### Core Fields

#### Identification
- `warehouseId` (string, optional): Custom warehouse identifier
- `code` (string, required, unique): Unique warehouse code (e.g., "WH-HN-001")
- `name` (string, required): Warehouse name
- `type` (enum, required): Type of warehouse (see WarehouseType enum)
- `status` (enum, required): Current status (active, paused, maintenance, inactive)

#### Legal/Management
- `companyName` (string): Operating company name
- `taxCode` (string): Tax identification number
- `businessLicense` (string): Business license number
- `warehouseLicense` (string): Warehouse operation license number
- `customsCode` (string): Customs code for bonded warehouses

#### Address (2-level: Province and Ward only, NO District)
- `addressDetail` (string, required): Detailed address
- `ward` (object, required): Ward information
  - `code` (string): Ward code
  - `name` (string): Ward name
- `province` (object, required): Province information
  - `code` (string): Province code
  - `name` (string): Province name
- `region` (enum, optional): Geographic region (northern, central, southern, highland)
- `location` (GeoJSON Point, optional): GPS coordinates for geospatial queries

#### Capacity/Technical
- `totalAreaM2` (number): Total area in square meters
- `usableAreaM2` (number): Usable storage area
- `storageCapacity` (number): Maximum storage capacity
- `capacityUnit` (enum): Unit of capacity (TON, PALLET, M3, CONTAINER)
- `zonesCount` (number): Number of storage zones
- `racksCount` (number): Number of storage racks
- `floorsCount` (number): Number of floors

#### Storage Conditions
- `temperatureMin` (number): Minimum temperature (°C)
- `temperatureMax` (number): Maximum temperature (°C)
- `humidityMin` (number): Minimum humidity (%)
- `humidityMax` (number): Maximum humidity (%)
- `specialConditions` (array): Special storage conditions

#### Operations/Staff
- `manager` (object): Warehouse manager information
  - `id` (string): Manager user ID
  - `name` (string): Manager name
- `contactPhone` (string): Contact phone number
- `contactEmail` (string): Contact email
- `workersCount` (number): Number of workers
- `workingShift` (enum): Working shift type
- `operatingHours` (string): Operating hours (e.g., "08:00 - 17:00")

#### Safety/Security
- `fireProtectionCert` (string): Fire protection certificate
- `securityLevel` (enum): Security level (basic, standard, high, maximum)
- `cameraSystem` (object): Camera system details
  - `cameraCount` (number): Number of cameras
  - `coverage` (string): Coverage area
  - `recordingDays` (number): Recording retention days
  - `isAIEnabled` (boolean): AI-enabled cameras
- `accessControl` (object): Access control details
  - `system` (string): Access control system type
  - `biometric` (boolean): Biometric access
  - `cardAccess` (boolean): Card-based access
  - `securityGuards` (number): Number of security guards
- `insurancePolicy` (string): Insurance policy number

#### Finance/Service
- `storageFee` (number): Storage fee per unit
- `handlingFee` (number): Handling fee per unit
- `currency` (enum): Currency (VND, USD, EUR)
- `paymentTerm` (enum): Payment terms

#### Audit/Meta
- `createdBy` (ObjectId): User who created the record
- `updatedBy` (ObjectId): User who last updated the record
- `createdAt` (Date): Creation timestamp
- `updatedAt` (Date): Last update timestamp
- `deletedAt` (Date, nullable): Soft delete timestamp
- `tenantId` (string, optional): Tenant identifier for multi-tenant support
- `metadata` (Map): Additional metadata

## Indexes

The schema includes the following indexes for optimal query performance:

1. **Unique Indexes**
   - `code` (unique)
   - `tenantId, code` (unique, sparse) - for multi-tenant support

2. **Single Field Indexes**
   - `warehouseId`
   - `name`
   - `type`
   - `status`
   - `taxCode`
   - `tenantId`

3. **Compound Indexes**
   - `province.code, ward.code`
   - `tenantId, status`
   - `type, status`
   - `region, status`

4. **Special Indexes**
   - `location` (2dsphere) - for geospatial queries
   - `name, companyName` (text) - for full-text search
   - `deletedAt` (TTL) - auto-delete after 730 days

## API Endpoints

### CRUD Operations

```
POST   /warehouses              - Create a new warehouse
GET    /warehouses              - List warehouses with filtering and pagination
GET    /warehouses/:id          - Get warehouse by ID
PATCH  /warehouses/:id          - Update warehouse
DELETE /warehouses/:id          - Soft delete warehouse
POST   /warehouses/:id/restore  - Restore soft-deleted warehouse
```

### Master Data Endpoints

```
GET /warehouses/provinces                 - Get all provinces
GET /warehouses/provinces/:code/wards    - Get wards by province
```

### Geospatial Queries

```
GET /warehouses/nearby?longitude=105.8342&latitude=21.0285&radiusKm=10
```

## Query Filters

The `GET /warehouses` endpoint supports the following query parameters:

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `type` (enum): Filter by warehouse type
- `status` (enum): Filter by status
- `provinceCode` (string): Filter by province code
- `wardCode` (string): Filter by ward code
- `region` (enum): Filter by region
- `tenantId` (string): Filter by tenant ID
- `search` (string): Full-text search on name and company name
- `bbox` (string): Geospatial bounding box (format: "longitude,latitude,radiusKm")

## Example Payloads

### Create Warehouse Request

```json
{
  "code": "WH-HN-001",
  "name": "Kho Hà Nội 1",
  "type": "general",
  "status": "active",
  "companyName": "Công ty TNHH ABC",
  "taxCode": "0123456789",
  "addressDetail": "123 Đường ABC",
  "ward": {
    "code": "00001",
    "name": "Phúc Xá"
  },
  "province": {
    "code": "01",
    "name": "Hà Nội"
  },
  "region": "northern",
  "location": {
    "type": "Point",
    "coordinates": [105.8342, 21.0285]
  },
  "totalAreaM2": 5000,
  "usableAreaM2": 4500,
  "storageCapacity": 1000,
  "capacityUnit": "TON",
  "temperatureMin": -20,
  "temperatureMax": 25,
  "manager": {
    "name": "Nguyễn Văn A"
  },
  "contactPhone": "+84901234567",
  "contactEmail": "warehouse@example.com",
  "securityLevel": "standard",
  "currency": "VND"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Warehouse created successfully",
  "error": null,
  "data": {
    "mode": "create",
    "item": {
      "id": "507f1f77bcf86cd799439011",
      "code": "WH-HN-001",
      "name": "Kho Hà Nội 1",
      "type": "general",
      "status": "active",
      "addressDetail": "123 Đường ABC",
      "ward": {
        "code": "00001",
        "name": "Phúc Xá"
      },
      "province": {
        "code": "01",
        "name": "Hà Nội"
      },
      "region": "northern",
      "location": {
        "type": "Point",
        "coordinates": [105.8342, 21.0285]
      },
      "fullAddress": "123 Đường ABC, Phúc Xá, Hà Nội",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "2024-01-09T05:00:00.000Z",
      "updatedAt": "2024-01-09T05:00:00.000Z"
    }
  }
}
```

### List Warehouses Response

```json
{
  "success": true,
  "message": "Warehouses retrieved successfully",
  "error": null,
  "data": {
    "mode": "list",
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

## Validation Rules

1. **Province and Ward Validation**
   - Province code must exist in the `provinces` collection
   - Ward code must exist in the `wards` collection and belong to the specified province

2. **Code Uniqueness**
   - Warehouse code must be unique within a tenant
   - For multi-tenant: `(tenantId, code)` combination must be unique

3. **Numeric Ranges**
   - Temperature: -100°C to 100°C
   - Humidity: 0% to 100%
   - Coordinates: Longitude -180 to 180, Latitude -90 to 90
   - `temperatureMin` must be ≤ `temperatureMax`
   - `humidityMin` must be ≤ `humidityMax`
   - `usableAreaM2` must be ≤ `totalAreaM2`

## Master Data Setup

Before creating warehouses, you need to seed the master data:

```bash
# Seed provinces and wards
npm run db:seed:provinces-wards

# Seed warehouse types
npm run db:seed:warehouse-types
```

## Geospatial Queries

The warehouse schema supports MongoDB's geospatial queries using the `location` field (GeoJSON Point with 2dsphere index).

### Find Warehouses Nearby

```bash
GET /warehouses/nearby?longitude=105.8342&latitude=21.0285&radiusKm=10&limit=20
```

This returns warehouses within 10km of the specified coordinates.

## Soft Delete

Warehouses support soft delete functionality:

- Deleted warehouses have `deletedAt` timestamp set
- Deleted warehouses are automatically excluded from queries
- Status is changed to 'inactive' on soft delete
- Warehouses can be restored using the restore endpoint
- After 730 days (2 years), soft-deleted warehouses are automatically hard-deleted (TTL index)

## Multi-Tenant Support

The schema supports multi-tenant architecture through the `tenantId` field:

- Include `tenantId` in create/update operations
- Unique constraint on `(tenantId, code)` ensures code uniqueness per tenant
- Filter by `tenantId` in queries
- Compound indexes optimize tenant-specific queries

## Permissions

The following permissions are used:

- `warehouse.create` - Create new warehouses
- `warehouse.read` - View warehouses
- `warehouse.update` - Update warehouses
- `warehouse.delete` - Delete warehouses
- `warehouse.manage` - Full warehouse management (create, read, update, delete)

## Security Considerations

1. Always validate province and ward codes against master data
2. Sanitize user input to prevent injection attacks
3. Use authentication and authorization guards on all endpoints
4. Validate numeric ranges to prevent invalid data
5. Use unique indexes to prevent duplicate warehouses
6. Log all warehouse operations for audit trails
