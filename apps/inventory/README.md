# Inventory Management Service

## Overview

The Inventory Management Service provides comprehensive product catalog and inventory tracking capabilities for the Open ERP system. It supports multi-organization deployments with product versioning, transaction tracking, and real-time stock management.

## Features

### Product Catalog Management
- **Multi-scope products**: Support for global and organization-specific products
- **Automatic versioning**: Every product update creates a new version snapshot
- **Version history**: Track all changes with rollback capability
- **Rich attributes**: Custom attributes, dimensions, storage conditions, hazard levels
- **SKU management**: Unique SKU enforcement per scope
- **Barcode support**: Product identification via barcodes

### Inventory Management
- **Real-time stock tracking**: Track available, reserved, damaged, and in-transit quantities
- **Multi-warehouse support**: Track stock across multiple warehouses
- **Transaction types**: IN, OUT, TRANSFER, ADJUSTMENT, DISPOSE, and more
- **Lot/batch tracking**: Track products by lot number and serial number
- **Expiry tracking**: Monitor expiring stock with alerts
- **Low stock alerts**: Automatic notifications for low inventory levels

### Transaction Management
- **Atomic operations**: All stock changes are transactional
- **Transaction ledger**: Complete audit trail of all inventory movements
- **Stock snapshots**: Preserve product state at transaction time
- **Reference tracking**: Link transactions to purchase orders, sales orders, etc.

## API Endpoints

### Product Endpoints

#### Create Product
```http
POST /products
Content-Type: application/json

{
  "sku": "PROD-001",
  "name": "Product Name",
  "scope": "organization",
  "organizationId": "507f1f77bcf86cd799439011",
  "type": "finished_good",
  "status": "active",
  "unit": "piece",
  "hazardLevel": "none",
  "minStockLevel": 10,
  "createdBy": "507f1f77bcf86cd799439012"
}
```

#### Get Products (Paginated)
```http
GET /products?page=1&limit=10&scope=organization&status=active
```

#### Get Product by ID
```http
GET /products/{id}
```

#### Get Product by SKU
```http
GET /products/sku/{sku}?organizationId=507f1f77bcf86cd799439011
```

#### Update Product
```http
PATCH /products/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "minStockLevel": 20,
  "updatedBy": "507f1f77bcf86cd799439012",
  "changeReason": "Stock level adjustment"
}
```

#### Delete Product (Soft Delete)
```http
DELETE /products/{id}
```

#### Restore Product
```http
POST /products/{id}/restore
```

#### Get Version History
```http
GET /products/{id}/versions?page=1&limit=10
```

#### Get Specific Version
```http
GET /products/{id}/versions/{version}
```

#### Rollback to Version
```http
POST /products/{id}/rollback/{version}?userId=507f1f77bcf86cd799439012
```

### Inventory Endpoints

#### Get Stock by Product and Warehouse
```http
GET /inventory/stock/{productId}/{warehouseId}
```

#### Get Stock by Product (All Warehouses)
```http
GET /inventory/stock/product/{productId}?page=1&limit=10
```

#### Get Stock by Warehouse
```http
GET /inventory/stock/warehouse/{warehouseId}?page=1&limit=10
```

#### Get Low Stock Alerts
```http
GET /inventory/alerts/low-stock?organizationId=507f1f77bcf86cd799439011
```

#### Get Expiring Stock Alerts
```http
GET /inventory/alerts/expiring?daysUntilExpiry=30
```

#### Create Transaction (IN/OUT/etc.)
```http
POST /inventory/transactions
Content-Type: application/json

{
  "type": "in",
  "productId": "507f1f77bcf86cd799439011",
  "destinationWarehouseId": "507f1f77bcf86cd799439012",
  "quantity": 100,
  "unitCost": 50.5,
  "currency": "VND",
  "notes": "Purchase order receipt",
  "createdBy": "507f1f77bcf86cd799439013"
}
```

#### Adjust Stock
```http
POST /inventory/stock/adjust
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "warehouseId": "507f1f77bcf86cd799439012",
  "newQuantity": 150,
  "reason": "Physical count adjustment",
  "adjustedBy": "507f1f77bcf86cd799439013"
}
```

#### Transfer Stock
```http
POST /inventory/stock/transfer
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "sourceWarehouseId": "507f1f77bcf86cd799439012",
  "destinationWarehouseId": "507f1f77bcf86cd799439013",
  "quantity": 50,
  "notes": "Warehouse rebalancing",
  "initiatedBy": "507f1f77bcf86cd799439014"
}
```

#### Get Transaction History
```http
GET /inventory/transactions?productId=507f1f77bcf86cd799439011&page=1&limit=10
```

## Data Models

### Product Schema
```typescript
{
  sku: string;                    // Unique within scope
  name: string;
  description?: string;
  scope: 'global' | 'organization';
  organizationId?: ObjectId;
  type: ProductType;
  status: ProductStatus;
  unit: Unit;
  trackingType: 'none' | 'lot' | 'serial';
  hazardLevel: HazardLevel;
  storageConditions?: StorageConditions;
  minStockLevel: number;
  currentVersion: number;
  versionCreatedAt: Date;
  // ... more fields
}
```

### Inventory Stock Schema
```typescript
{
  productId: ObjectId;
  productSnapshot: StockProductSnapshot;
  warehouseId: ObjectId;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  inTransitQuantity: number;
  lots: LotInfo[];
  valuationMethod: ValuationMethod;
  averageCost: number;
  // ... more fields
}
```

### Inventory Transaction Schema
```typescript
{
  transactionNumber: string;
  type: InventoryTransactionType;
  status: TransactionStatus;
  productId: ObjectId;
  productSnapshot: TransactionProductSnapshot;
  sourceWarehouseId?: ObjectId;
  destinationWarehouseId?: ObjectId;
  quantity: number;
  unitCost?: number;
  lotInfo?: LotInfo;
  stockBefore?: number;
  stockAfter?: number;
  transactionDate: Date;
  // ... more fields
}
```

## Running the Service

### Development Mode
```bash
npm run start:inventory:dev
```

### Production Mode
```bash
npm run build:inventory
npm run start:inventory
```

### Environment Variables
```env
INVENTORY_PORT=3005
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=open_erp
```

## Testing

### Run Tests
```bash
npm test -- apps/inventory
```

### Run Integration Tests
```bash
npm run test:e2e -- apps/inventory
```

## Swagger Documentation

Once the service is running, access the interactive API documentation at:
```
http://localhost:3005/api
```

## Key Features

### Versioning System
- Every product update automatically creates a version snapshot
- Version history is maintained in `product_versions` collection
- Rollback to any previous version
- Track who made changes and when

### Snapshot-Based Design
- Product snapshots in transactions preserve state at transaction time
- Enables accurate historical reporting
- No dependency on external references for historical data

### Transaction Processing
- All stock changes go through transaction ledger
- Atomic updates using MongoDB sessions
- Automatic stock level updates
- Complete audit trail

### Multi-Organization Support
- Products can be global or organization-specific
- SKU uniqueness enforced per scope
- Organization-level stock tracking

### Alerts & Monitoring
- Low stock alerts based on minimum levels
- Expiring stock alerts for perishable items
- Real-time stock availability queries

## Architecture

### Service Layer
- `ProductService`: Handles product CRUD and versioning
- `InventoryService`: Manages stock and transactions

### Repository Layer
- `ProductRepository`: Product data access
- `ProductVersionRepository`: Version history access
- `InventoryStockRepository`: Stock data access
- `InventoryTransactionRepository`: Transaction data access

### Controller Layer
- `ProductController`: Product API endpoints
- `InventoryController`: Inventory API endpoints
- `HealthController`: Health check endpoint

## Best Practices

1. **Always provide change reasons**: Include a `changeReason` when updating products
2. **Use transactions for stock changes**: Create inventory transactions instead of directly modifying stock
3. **Track lot numbers**: For perishable items, always provide lot information
4. **Monitor alerts**: Regularly check low stock and expiring stock alerts
5. **Validate scope**: Ensure organization-scoped products have organizationId

## Security Considerations

- TODO: Implement RBAC guards for scope-based access
- TODO: Ensure users can only access products in their organization
- TODO: Implement audit logging for sensitive operations

## Future Enhancements

- [ ] Add product categories management
- [ ] Implement product bundles/kits
- [ ] Add multi-currency cost tracking
- [ ] Implement reserved stock management
- [ ] Add production order integration
- [ ] Implement advanced reporting

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
