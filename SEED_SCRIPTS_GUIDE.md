# Database Seeding Quick Reference

## Quick Start

```bash
# Seed everything (requires MongoDB running)
npm run db:seed:all

# Seed with fresh data (drops existing)
npm run db:seed:all -- --drop --confirm

# Test without making changes
npm run db:seed:all -- --dry-run
```

## Individual Seeds

```bash
# Provinces (34 Vietnam provinces/cities)
npm run db:seed:provinces

# Wards (3,321 wards from GeoJSON)
npm run db:seed:wards

# Warehouse Types (12 types)
npm run db:seed:warehouse-types

# Sample Warehouses (default: 20, customizable)
npm run db:seed:warehouses -- --count 50
```

## Common Options

- `--dry-run` - Validate without database changes
- `--drop` - Drop existing data (requires `--confirm`)
- `--confirm` - Confirm destructive operations
- `--limit <n>` - Limit records to process
- `--warehouse-count <n>` - Number of sample warehouses

## MongoDB Setup

Ensure `.env` file has correct MongoDB configuration:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_USER=erp_user
MONGODB_PASS=erp_password
MONGODB_DB=open_erp
MONGODB_AUTH_SOURCE=admin
```

Start MongoDB via Docker:

```bash
npm run docker:dev:up
```

## Full Documentation

See [scripts/seeds/README.md](scripts/seeds/README.md) for:
- Detailed usage instructions
- CLI options reference
- Troubleshooting guide
- Development guidelines

## Data Files

- **Provinces**: `scripts/data/Việt Nam (tỉnh thành) - 34.geojson` (32MB)
- **Wards**: `scripts/data/Việt Nam (phường xã) - 34.geojson` (277MB, extracted from zip)

## Features

✅ **Idempotent** - Safe to run multiple times  
✅ **Authenticated** - Proper MongoDB authentication with fallback  
✅ **GeoJSON Support** - Automatic centroid, bbox, area calculation  
✅ **Dry-Run Mode** - Validate before committing changes  
✅ **Detailed Logging** - Statistics and error reporting  
✅ **CLI Options** - Flexible configuration via command-line flags

## Examples

```bash
# Seed only provinces with limited records
npm run db:seed:provinces -- --limit 10

# Reset and seed all with 30 warehouses
npm run db:seed:all -- --drop --confirm --warehouse-count 30

# Skip wards (they take long) and test
npm run db:seed:all -- --skip-wards --dry-run

# Seed from custom GeoJSON file
npm run db:seed:provinces -- --file "/path/to/custom.geojson"
```

## Need Help?

Check:
1. MongoDB is running: `docker compose -f docker-compose.dev.yml ps`
2. Connection works: `npm run db:test`
3. Detailed docs: `scripts/seeds/README.md`
