# Dynamic Product Type & Category Management Implementation

## Overview

This implementation transforms hardcoded `ProductType` enum and embedded `Category` snapshots into dynamic, database-managed entities. This provides flexibility to add, modify, and manage product types and categories without code deployments.

## What Was Implemented

### 1. New Schemas

#### ProductType Schema (`libs/shared/schemas/product-type.schema.ts`)
- **Collection:** `product_types`
- **Fields:**
  - `code`: Unique identifier (replaces enum key)
  - `name`: Display name
  - `description`: Description of the product type
  - `isActive`: Boolean flag for active/inactive status
  - `attributes`: Array of custom attribute definitions (type, validation, options)
  - Standard audit fields: `createdBy`, `updatedBy`, `deletedAt`, `metadata`
- **Features:**
  - Soft delete support
  - Full-text search on name, description, and code
  - Unique code constraint

#### ProductCategory Schema (`libs/shared/schemas/product-category.schema.ts`)
- **Collection:** `product_categories`
- **Fields:**
  - `code`: Unique identifier
  - `name`: Display name
  - `parentId`: Reference to parent category (self-reference)
  - `path`: Materialized path for efficient tree queries (e.g., `/root_id/child_id/`)
  - `level`: Tree depth level
  - `description`: Description of the category
  - `isActive`: Boolean flag for active/inactive status
  - `order`: Display order within the same parent
  - Standard audit fields: `createdBy`, `updatedBy`, `deletedAt`, `metadata`
- **Features:**
  - Hierarchical tree structure with materialized paths
  - Automatic path and level calculation on save
  - Soft delete support
  - Full-text search
  - Tree traversal operations

### 2. API Endpoints

#### Product Type Endpoints
All endpoints are under `/api/inventory/config/product-types`

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| POST | `/` | Create new product type | MANAGE_PRODUCT_TYPE |
| GET | `/` | List all product types with pagination | PRODUCT_TYPE_READ |
| GET | `/active` | Get only active product types | PRODUCT_TYPE_READ |
| GET | `/:id` | Get product type by ID | PRODUCT_TYPE_READ |
| PUT | `/:id` | Update product type | MANAGE_PRODUCT_TYPE |
| DELETE | `/:id` | Soft delete product type | MANAGE_PRODUCT_TYPE |

#### Product Category Endpoints
All endpoints are under `/api/inventory/config/product-categories`

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| POST | `/` | Create new category | MANAGE_PRODUCT_CATEGORY |
| GET | `/` | List categories with filters | PRODUCT_CATEGORY_READ |
| GET | `/tree` | Get full category tree | PRODUCT_CATEGORY_READ |
| GET | `/roots` | Get root categories only | PRODUCT_CATEGORY_READ |
| GET | `/:id` | Get category by ID | PRODUCT_CATEGORY_READ |
| GET | `/:id/children` | Get direct children | PRODUCT_CATEGORY_READ |
| GET | `/:id/descendants` | Get all descendants | PRODUCT_CATEGORY_READ |
| PUT | `/:id` | Update category | MANAGE_PRODUCT_CATEGORY |
| DELETE | `/:id` | Soft delete category | MANAGE_PRODUCT_CATEGORY |

### 3. New Permissions

Added to `libs/shared/types/permission.enum.ts`:

- `PRODUCT_TYPE_CREATE`: Create product types
- `PRODUCT_TYPE_READ`: Read product types
- `PRODUCT_TYPE_UPDATE`: Update product types
- `PRODUCT_TYPE_DELETE`: Delete product types
- `MANAGE_PRODUCT_TYPE`: Full management of product types

- `PRODUCT_CATEGORY_CREATE`: Create product categories
- `PRODUCT_CATEGORY_READ`: Read product categories
- `PRODUCT_CATEGORY_UPDATE`: Update product categories
- `PRODUCT_CATEGORY_DELETE`: Delete product categories
- `MANAGE_PRODUCT_CATEGORY`: Full management of product categories

### 4. Updated Product Schema

The `Product` schema (`libs/shared/schemas/product.schema.ts`) now includes:
- `typeId`: Reference to `ProductType` collection (optional, for dynamic types)
- `categoryId`: Reference to `ProductCategory` collection (optional, for dynamic categories)

**Backward Compatibility:** The existing `type` (enum) and `category` (snapshot) fields remain for backward compatibility.

### 5. Migration Scripts

#### Migration 1: Populate Product Types (`migrations/20260130000001-populate-product-types.js`)
- Creates `product_types` collection
- Populates with all 40 product types from the original enum
- Creates necessary indexes
- Idempotent: Won't duplicate if run multiple times

#### Migration 2: Create Product Categories (`migrations/20260130000002-create-product-categories.js`)
- Creates `product_categories` collection
- Populates with 4 sample root categories:
  - Electronics
  - Food & Beverage
  - Textiles
  - Industrial
- Creates necessary indexes

## Architecture

### Repository Layer
- `ProductTypeRepository`: Database operations for product types
- `ProductCategoryRepository`: Database operations for product categories with tree structure support

### Service Layer
- `ProductTypeService`: Business logic for product type management
- `ProductCategoryService`: Business logic for product category management with tree validation

### Controller Layer
- `ProductTypeController`: REST API endpoints for product types
- `ProductCategoryController`: REST API endpoints for product categories

### Features Implemented

#### Product Type Management
- ✅ CRUD operations
- ✅ Unique code validation
- ✅ Active/inactive status
- ✅ Custom attribute definitions
- ✅ Soft delete
- ✅ Full-text search
- ✅ Pagination

#### Product Category Management
- ✅ CRUD operations
- ✅ Hierarchical tree structure
- ✅ Materialized path for efficient queries
- ✅ Parent-child relationships
- ✅ Circular reference prevention
- ✅ Cascade path updates when moving categories
- ✅ Soft delete with child validation
- ✅ Full-text search
- ✅ Pagination
- ✅ Tree view support

## How to Use

### Running Migrations

```bash
# Run all migrations
npm run db:migrate

# Or run specific migration
npm run db:migrate -- -f 20260130000001-populate-product-types.js
```

### API Examples

#### Create a Product Type
```bash
POST /api/inventory/config/product-types
Content-Type: application/json

{
  "code": "custom_type",
  "name": "Custom Product Type",
  "description": "A custom product type for specific needs",
  "isActive": true,
  "attributes": [
    {
      "name": "color",
      "type": "select",
      "label": "Product Color",
      "required": false,
      "options": ["Red", "Blue", "Green"]
    }
  ]
}
```

#### Create a Product Category
```bash
POST /api/inventory/config/product-categories
Content-Type: application/json

{
  "code": "smartphones",
  "name": "Smartphones",
  "parentId": "507f1f77bcf86cd799439011",  // ID of Electronics category
  "description": "Mobile smartphones and devices",
  "isActive": true,
  "order": 1
}
```

#### Get Category Tree
```bash
GET /api/inventory/config/product-categories/tree
```

## Validation & Business Logic

### Product Type
- Code must be unique
- Cannot delete a product type that is in use by products (TODO: implement check)

### Product Category
- Code must be unique
- Cannot create a category with non-existent parent
- Cannot move a category to one of its descendants (circular reference prevention)
- Cannot delete a category that has children
- Cannot delete a category that is in use by products (TODO: implement check)

## Future Enhancements

### Recommended (Not Yet Implemented)
1. **Product Usage Validation**: Prevent deletion of types/categories in use by products
2. **Bulk Operations**: Import/export product types and categories
3. **Category Icons**: Add icon field for UI representation
4. **Translation Support**: Multi-language names and descriptions
5. **Attribute Validation**: Runtime validation of product attributes based on type
6. **Caching**: Redis/memory cache for frequently accessed types and categories
7. **Audit Logging**: Track all changes to types and categories
8. **API Versioning**: Support multiple API versions

## Testing

### Manual Testing Checklist
- [ ] Create product type with valid data
- [ ] Create product type with duplicate code (should fail)
- [ ] Update product type
- [ ] Delete product type (soft delete)
- [ ] List product types with pagination
- [ ] Search product types
- [ ] Create root category
- [ ] Create child category
- [ ] Get category tree
- [ ] Move category to different parent
- [ ] Attempt to create circular reference (should fail)
- [ ] Delete category with children (should fail)
- [ ] Delete childless category

### Unit Tests (To Be Added)
- ProductTypeService unit tests
- ProductCategoryService unit tests
- Tree structure validation tests
- Circular reference prevention tests

### Integration Tests (To Be Added)
- API endpoint contract tests
- Migration script tests

## Notes

- All IDs use MongoDB ObjectId format
- Timestamps are managed by Mongoose (createdAt, updatedAt)
- Soft deletes use `deletedAt` field with TTL index
- Full OpenAPI/Swagger documentation is provided for all endpoints
- All endpoints follow the standardized response envelope format

## Files Modified/Created

### New Files
- `libs/shared/schemas/product-type.schema.ts`
- `libs/shared/schemas/product-category.schema.ts`
- `apps/inventory/src/dto/product-type.dto.ts`
- `apps/inventory/src/dto/product-category.dto.ts`
- `apps/inventory/src/repositories/product-type.repository.ts`
- `apps/inventory/src/repositories/product-category.repository.ts`
- `apps/inventory/src/services/product-type.service.ts`
- `apps/inventory/src/services/product-category.service.ts`
- `apps/inventory/src/controllers/product-type.controller.ts`
- `apps/inventory/src/controllers/product-category.controller.ts`
- `migrations/20260130000001-populate-product-types.js`
- `migrations/20260130000002-create-product-categories.js`

### Modified Files
- `libs/shared/types/permission.enum.ts` - Added new permissions
- `libs/shared/schemas/index.ts` - Exported new schemas
- `libs/shared/schemas/product.schema.ts` - Added typeId and categoryId fields
- `apps/inventory/src/inventory.module.ts` - Registered new components

## Summary

This implementation successfully transforms hardcoded product types and categories into a flexible, database-driven system. The solution maintains backward compatibility while providing a foundation for dynamic product management. All code follows the project's coding standards and patterns.
