# Database Seed Scripts

This directory contains seed scripts for populating the database with Vietnamese administrative divisions (provinces, wards) and sample warehouse data.

## Overview

The seed scripts are designed to:
- Be **idempotent** - can be run multiple times safely using upsert operations
- Support **dry-run mode** - validate without making database changes
- Handle **MongoDB authentication** properly
- Provide detailed **logging and statistics**
- Work with **GeoJSON data** for geographic information

## Prerequisites

1. **Environment Configuration**
   Ensure your `.env` file has the correct MongoDB credentials:
   ```bash
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_USER=erp_user
   MONGODB_PASS=erp_password
   MONGODB_DB=open_erp
   MONGODB_AUTH_SOURCE=admin
   ```

2. **Data Files**
   - `scripts/data/Việt Nam (tỉnh thành) - 34.geojson` - Provinces GeoJSON
   - `scripts/data/Việt Nam (phường xã) - 34.geojson` - Wards GeoJSON (optional)

3. **Dependencies**
   All required packages should already be installed via `npm install`:
   - `@turf/turf` - Geospatial calculations
   - `mongoose` - MongoDB ODM
   - `dotenv` - Environment variables

## Scripts

### 1. seed-all.ts - Master Script

Runs all seed operations in sequence.

**Usage:**
```bash
# Run all seeds
npm run db:seed:all

# Or directly with ts-node
ts-node scripts/seeds/seed-all.ts

# With options
ts-node scripts/seeds/seed-all.ts --drop --confirm
ts-node scripts/seeds/seed-all.ts --dry-run
ts-node scripts/seeds/seed-all.ts --warehouse-count 50
ts-node scripts/seeds/seed-all.ts --skip-warehouses
```

**Options:**
- `--drop` - Drop existing data before seeding (requires --confirm)
- `--confirm` - Confirm destructive operations
- `--dry-run` - Validate without writing to database
- `--skip-provinces` - Skip provinces seeding
- `--skip-wards` - Skip wards seeding
- `--skip-warehouse-types` - Skip warehouse types seeding
- `--skip-warehouses` - Skip warehouses seeding
- `--warehouse-count <n>` - Number of sample warehouses (default: 20)

**Output:**
```
============================================================
DATABASE SEED - ALL OPERATIONS
============================================================
...
✓ Provinces seeding completed successfully
✓ Wards seeding completed successfully
✓ Warehouse types seeding completed successfully
✓ Warehouses seeding completed successfully
...
```

### 2. seed-provinces.ts - Provinces Seeding

Seeds Vietnamese provinces from GeoJSON file (34 provinces/cities).

**Usage:**
```bash
npm run db:seed:provinces

# Or with ts-node
ts-node scripts/seeds/seed-provinces.ts

# With options
ts-node scripts/seeds/seed-provinces.ts --file "path/to/provinces.geojson"
ts-node scripts/seeds/seed-provinces.ts --drop
ts-node scripts/seeds/seed-provinces.ts --dry-run
ts-node scripts/seeds/seed-provinces.ts --limit 10
```

**Options:**
- `--file <path>` - Path to GeoJSON file (default: scripts/data/Việt Nam (tỉnh thành) - 34.geojson)
- `--drop` - Drop existing provinces before seeding
- `--dry-run` - Validate without writing to database
- `--source <name>` - Geometry source identifier (default: gov)
- `--limit <n>` - Limit number of features to process
- `--skip <n>` - Skip first n features

**Features:**
- Extracts province code, name from GeoJSON properties
- Computes centroid, bbox, area using @turf
- Creates/ensures 2dsphere index on geometry field
- Upserts based on unique `code` field

**Output Fields:**
- `code` - Province code
- `name` - Province name (Vietnamese)
- `geometry` - GeoJSON geometry (Polygon/MultiPolygon)
- `centroid` - Center point {lat, lon}
- `bbox` - Bounding box [minLon, minLat, maxLon, maxLat]
- `areaSqKm` - Area in square kilometers
- `geometrySource` - Source identifier
- `geometryVersion` - Version number
- `geometryUpdatedAt` - Last geometry update timestamp

### 3. seed-wards.ts - Wards Seeding

Seeds Vietnamese wards (phường/xã) from GeoJSON file.

**Usage:**
```bash
npm run db:seed:wards

# Or with ts-node
ts-node scripts/seeds/seed-wards.ts

# With options
ts-node scripts/seeds/seed-wards.ts --file "path/to/wards.geojson"
ts-node scripts/seeds/seed-wards.ts --drop
ts-node scripts/seeds/seed-wards.ts --dry-run
```

**Options:**
Same as seed-provinces.ts

**Features:**
- Links wards to provinces via `provinceCode`
- Extracts ward code, name, province linkage from properties
- Computes centroid, bbox, area
- Upserts based on composite key: `{code, provinceCode}`

**Output Fields:**
- `code` - Ward code
- `name` - Ward name (Vietnamese)
- `provinceCode` - Parent province code
- `geometry` - GeoJSON geometry
- `centroid` - Center point {lat, lon}
- `bbox` - Bounding box
- `areaSqKm` - Area in square kilometers

### 4. seed-warehouse-types.ts - Warehouse Types

Seeds warehouse type master data (12 types).

**Usage:**
```bash
npm run db:seed:warehouse-types

# Or with ts-node
ts-node scripts/seeds/seed-warehouse-types.ts

# With options
ts-node scripts/seeds/seed-warehouse-types.ts --drop
ts-node scripts/seeds/seed-warehouse-types.ts --dry-run
```

**Options:**
- `--drop` - Drop existing warehouse types before seeding
- `--dry-run` - Validate without writing to database

**Warehouse Types:**
1. General Warehouse (Kho tổng hợp)
2. Cold Storage (Kho lạnh)
3. Bonded Warehouse (Kho ngoại quan)
4. Distribution Center (Trung tâm phân phối)
5. Cross-dock Warehouse (Kho cross-dock)
6. Automated Warehouse (Kho tự động)
7. Hazmat Warehouse (Kho hàng nguy hiểm)
8. Pharmaceutical Warehouse (Kho dược phẩm)
9. Food Grade Warehouse (Kho thực phẩm)
10. Textile Warehouse (Kho dệt may)
11. Electronics Warehouse (Kho điện tử)
12. Customs Warehouse (Kho hải quan)

### 5. seed-warehouses.ts - Sample Warehouses

Generates sample warehouse records with realistic data.

**Usage:**
```bash
npm run db:seed:warehouses

# Or with ts-node
ts-node scripts/seeds/seed-warehouses.ts

# With options
ts-node scripts/seeds/seed-warehouses.ts --count 50
ts-node scripts/seeds/seed-warehouses.ts --drop
ts-node scripts/seeds/seed-warehouses.ts --dry-run
```

**Options:**
- `--count <n>` - Number of warehouses to create (default: 20)
- `--drop` - Drop existing warehouses before seeding
- `--dry-run` - Validate without writing to database

**Features:**
- Generates warehouses with valid locations within Vietnam
- Links to existing provinces and wards
- Assigns random warehouse types
- Creates realistic capacity, area, and contact information
- Uses province centroids to generate nearby coordinates

**Generated Fields:**
- `code` - Unique warehouse code (e.g., WH202400001)
- `name` - Warehouse name
- `type` - Warehouse type
- `status` - Active status
- `addressDetail` - Street address
- `ward` - Ward snapshot {code, name, provinceCode}
- `province` - Province snapshot {code, name}
- `location` - GeoJSON Point with coordinates
- `totalAreaM2` - Total area in square meters
- `storageCapacity` - Storage capacity
- `capacityUnit` - Unit (TON, PALLET, M3, CONTAINER)
- `contact` - Contact information {phone, email}

## Common Workflows

### Initial Database Setup

```bash
# 1. Ensure MongoDB is running and .env is configured
# 2. Run all seeds
npm run db:seed:all

# Or run individually
npm run db:seed:provinces
npm run db:seed:wards
npm run db:seed:warehouse-types
npm run db:seed:warehouses
```

### Reset and Re-seed

```bash
# Drop and re-seed all (DESTRUCTIVE)
ts-node scripts/seeds/seed-all.ts --drop --confirm

# Or drop and re-seed individually
ts-node scripts/seeds/seed-provinces.ts --drop
ts-node scripts/seeds/seed-wards.ts --drop
ts-node scripts/seeds/seed-warehouse-types.ts --drop
ts-node scripts/seeds/seed-warehouses.ts --drop
```

### Testing Before Making Changes

```bash
# Dry run to validate without changes
ts-node scripts/seeds/seed-all.ts --dry-run

# Test with limited data
ts-node scripts/seeds/seed-provinces.ts --limit 5 --dry-run
ts-node scripts/seeds/seed-warehouses.ts --count 5 --dry-run
```

## Database Indexes

The seed scripts ensure the following indexes exist:

**Provinces:**
- Unique index on `code`
- 2dsphere index on `geometry`
- Regular index on `centroid`

**Wards:**
- Unique index on `code`
- Composite index on `{code, provinceCode}`
- 2dsphere index on `geometry`
- Regular index on `provinceCode`

**Warehouses:**
- Unique index on `code`
- 2dsphere index on `location`
- Regular indexes on `type`, `status`, `province.code`, `ward.code`

## Troubleshooting

### Authentication Errors

If you encounter authentication errors:

1. **Check .env file:**
   ```bash
   MONGODB_USER=erp_user
   MONGODB_PASS=erp_password
   MONGODB_AUTH_SOURCE=admin
   ```

2. **Try embedded credentials:**
   The scripts automatically retry with credentials embedded in URI if initial connection fails.

3. **Verify MongoDB user exists:**
   ```bash
   mongo admin -u admin -p admin_password
   > db.getUsers()
   ```

### File Not Found

If GeoJSON files are not found:

1. **Check file location:**
   ```bash
   ls -la scripts/data/
   ```

2. **Specify custom path:**
   ```bash
   ts-node scripts/seeds/seed-provinces.ts --file "/path/to/provinces.geojson"
   ```

### Connection Timeout

If connection times out:

1. **Check MongoDB is running:**
   ```bash
   docker ps | grep mongo
   # or
   systemctl status mongod
   ```

2. **Verify network connectivity:**
   ```bash
   telnet localhost 27017
   ```

3. **Increase timeout in .env:**
   ```bash
   MONGODB_SERVER_SELECTION_TIMEOUT=10000
   MONGODB_CONNECT_TIMEOUT=20000
   ```

### Duplicate Key Errors

If you get duplicate key errors on re-runs:

1. **Use --drop flag:**
   ```bash
   ts-node scripts/seeds/seed-provinces.ts --drop
   ```

2. **Or manually clear collection:**
   ```bash
   mongo open_erp
   > db.provinces.deleteMany({})
   ```

## Development

### Adding New Seed Scripts

1. Create a new file: `scripts/seeds/seed-<name>.ts`
2. Follow the pattern from existing scripts
3. Export a main function that accepts options
4. Add to `seed-all.ts` if appropriate
5. Add npm script to `package.json`
6. Update this README

### Testing Seed Scripts

```bash
# Test with dry-run first
ts-node scripts/seeds/seed-<name>.ts --dry-run

# Test with limited data
ts-node scripts/seeds/seed-<name>.ts --limit 5

# Test in local MongoDB
MONGODB_URI=mongodb://localhost:27017 MONGODB_DB=test_db ts-node scripts/seeds/seed-<name>.ts
```

## References

- [Turf.js Documentation](https://turfjs.org/)
- [MongoDB 2dsphere Indexes](https://docs.mongodb.com/manual/core/2dsphere/)
- [GeoJSON Specification](https://geojson.org/)
- [Mongoose Documentation](https://mongoosejs.com/)

## License

Internal use only - Open ERP Backend Project
