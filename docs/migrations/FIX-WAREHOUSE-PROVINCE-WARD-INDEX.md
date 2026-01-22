# Migration: Fix Warehouse Province/Ward Index

## Overview

This migration fixes an issue where the warehouse collection had (or was expected to have) an incorrect unique constraint on the compound index of `province.code` and `ward.code` fields. This constraint prevented multiple warehouses from being created in the same geographical area, which is not aligned with business requirements.

## Problem Statement

**Issue:** The system was preventing creation of multiple warehouses with the same `provinceCode` or `wardCode`, returning a MongoDB duplicate key error.

**Root Cause:** A unique compound index on `province.code` and `ward.code` existed (or was expected) in the database, which incorrectly enforced uniqueness across these geographical fields.

**Business Requirement:** Multiple warehouses should be allowed in the same province/ward. Only the warehouse `code` field (and the combination of `tenantId` + `code` for multi-tenant environments) should be unique.

## Migration Details

**Migration File:** `migrations/20260122000001-fix-warehouse-province-ward-index.js`

**Created:** 2026-01-22

### What This Migration Does

1. **Identifies** any unique compound index on `province.code` and `ward.code`
2. **Drops** the unique index if found
3. **Creates** a non-unique compound index for query optimization (if not already present)

### How to Run

```bash
# Run the migration
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback if needed (though not recommended)
npm run db:migrate:down
```

### Expected Output

When running the migration, you should see output similar to:

```
Starting migration: fix-warehouse-province-ward-index
Current indexes on warehouses collection:
  - _id_: {"_id":1}
  - code_1: {"code":1} (UNIQUE)
  - province.code_1_ward.code_1: {"province.code":1,"ward.code":1} (UNIQUE)
  ...
Found problematic unique index: province.code_1_ward.code_1
Dropping unique index on province.code and ward.code...
Successfully dropped index: province.code_1_ward.code_1
Creating non-unique compound index on province.code and ward.code...
Successfully created non-unique index
Migration completed successfully
```

If no unique index exists, you'll see:

```
Starting migration: fix-warehouse-province-ward-index
Current indexes on warehouses collection:
  - _id_: {"_id":1}
  - code_1: {"code":1} (UNIQUE)
  ...
No problematic unique index found on province.code and ward.code
Non-unique compound index already exists
Migration completed successfully
```

## Verification

After running the migration, you can verify the fix by:

1. **Testing via API:**

```bash
# Create first warehouse
curl -X POST http://localhost:3006/warehouses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "WH-001",
    "name": "Warehouse A",
    "type": "general",
    "addressDetail": "123 Street A",
    "province": {"code": "01", "name": "Hà Nội"},
    "ward": {"code": "00001", "name": "Phúc Xá"}
  }'

# Create second warehouse with same province/ward but different code
curl -X POST http://localhost:3006/warehouses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "WH-002",
    "name": "Warehouse B",
    "type": "general",
    "addressDetail": "456 Street B",
    "province": {"code": "01", "name": "Hà Nội"},
    "ward": {"code": "00001", "name": "Phúc Xá"}
  }'
```

Both requests should succeed with HTTP 201 status.

2. **Testing via MongoDB Shell:**

```javascript
// Check indexes
db.warehouses.getIndexes()

// Should NOT have a unique index on province.code and ward.code
// Should have a non-unique index for query optimization

// Verify by checking the index definition:
db.warehouses.getIndexes().forEach(index => {
  if (index.key['province.code'] && index.key['ward.code']) {
    print(`Index ${index.name}: unique = ${index.unique || false}`);
  }
});
```

3. **Running Unit Tests:**

```bash
npm test -- warehouse.service.spec.ts
```

The test suite includes a specific test case:
- `should allow creating multiple warehouses with same province and ward codes but different warehouse codes`

## Impact

### Before Migration
- ❌ Could NOT create multiple warehouses in the same province/ward
- ❌ Business operations limited by incorrect geographical uniqueness constraint
- ❌ Error: `E11000 duplicate key error` when attempting to create warehouses in same location

### After Migration
- ✅ CAN create multiple warehouses in the same province/ward
- ✅ Warehouse `code` uniqueness is still enforced (per tenant)
- ✅ Query performance maintained with non-unique compound index
- ✅ Aligns with business requirements for warehouse management

## Schema Changes

### Warehouse Collection Indexes

**Removed:**
- Unique compound index: `{ 'province.code': 1, 'ward.code': 1 }` with `unique: true`

**Kept/Added:**
- Non-unique compound index: `{ 'province.code': 1, 'ward.code': 1 }` for query optimization
- Unique index: `{ code: 1 }` (unchanged)
- Unique compound index: `{ tenantId: 1, code: 1 }` (unchanged, for multi-tenant)

## Rollback

If you need to rollback this migration:

```bash
npm run db:migrate:down
```

**Warning:** Rollback will remove the non-unique index but will NOT restore the incorrect unique index, as it was identified as a bug. Manual intervention would be required if you need to restore the original state.

## Related Files

- Schema: `libs/shared/schemas/warehouse.schema.ts`
- Service: `apps/inventory/src/services/warehouse.service.ts`
- Controller: `apps/inventory/src/controllers/warehouse.controller.ts`
- Tests: `apps/inventory/test/warehouse.service.spec.ts`
- Migration: `migrations/20260122000001-fix-warehouse-province-ward-index.js`

## References

- Issue: "Bug: Không cho phép tạo nhiều kho hàng cùng Province/Ward (sai giới hạn/validation)"
- MongoDB Index Documentation: https://docs.mongodb.com/manual/indexes/
- NestJS Mongoose Documentation: https://docs.nestjs.com/techniques/mongodb
