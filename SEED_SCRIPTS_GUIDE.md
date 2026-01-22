# Database Seed Scripts - Complete Guide

This guide provides comprehensive documentation for the database seeding scripts in the open-erp-backend project.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [CLI Options](#cli-options)
- [Usage Examples](#usage-examples)
- [Performance & Resource Usage](#performance--resource-usage)
- [Safety & Best Practices](#safety--best-practices)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)

## Overview

The seed scripts provide a way to populate the database with test data for development and staging environments. The scripts are:

- **Idempotent**: Safe to run multiple times (uses upsert operations)
- **Configurable**: Supports various CLI options
- **Performance-optimized**: Uses batch processing and bulkWrite operations
- **Reportable**: Generates JSON reports with execution statistics
- **Secure**: Hashes passwords using bcrypt

### Scripts Included

1. **seed-roles.ts** - Seeds 7 system roles
2. **seed-organizations.ts** - Seeds 500 organizations (configurable)
3. **seed-users.ts** - Seeds 1 SuperAdmin + 10,000 users (configurable)
4. **seed-relations.ts** - Creates user-role-organization relationships
5. **seed-all.ts** - Runs all seed scripts in sequence

## Quick Start

### Prerequisites

1. **MongoDB running** - Ensure MongoDB is accessible
2. **Environment configured** - Set up `.env` file with MongoDB credentials
3. **Dependencies installed** - Run `npm install`

### Run All Seeds

```bash
# Run all seed scripts with default settings
npm run db:seed:all

# Or with ts-node directly
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts
```

### Run Individual Seeds

```bash
# Seed roles
npm run db:seed:roles

# Seed organizations
npm run db:seed:organizations

# Seed users
npm run db:seed:users

# Seed relationships
npm run db:seed:relations
```

## Scripts

### 1. seed-roles.ts

Seeds system roles with predefined permissions.

**Roles Created:**
- `SUPER_ADMIN` - System administrator (global scope)
- `ORG_ADMIN` - Organization administrator
- `ORG_USER` - Regular organization user
- `WAREHOUSE_MANAGER` - Warehouse manager
- `INVENTORY_VIEWER` - Inventory viewer (read-only)
- `REPORT_VIEWER` - Report viewer (read-only)
- `GUEST` - Guest user (limited access)

**Usage:**
```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --drop --confirm
```

**Options:**
- `--confirm` - Required for actual database writes
- `--dry-run` - Preview without writing to database
- `--drop` - Drop existing roles before seeding (requires --confirm)

**Expected Duration:** < 1 second

### 2. seed-organizations.ts

Seeds organizations with realistic data using faker.js.

**Features:**
- Configurable count (default: 500)
- Unique tax IDs (ORG0000000001, ORG0000000002, etc.)
- Realistic company names, addresses, contacts
- Various organization types (HOLDING, COMPANY, BRANCH, etc.)
- Optional hierarchy mode

**Usage:**
```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 500 --batch-size 100 --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 100 --hierarchy --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --dry-run
```

**Options:**
- `--count <n>` - Number of organizations to seed (default: 500)
- `--batch-size <n>` - Batch size for bulk operations (default: 100)
- `--hierarchy` - Create hierarchical organizations (20% HOLDING, 30% BRANCH)
- `--confirm` - Required for actual database writes
- `--dry-run` - Preview without writing to database
- `--drop` - Drop existing organizations before seeding (requires --confirm)

**Expected Duration:** 2-5 seconds for 500 organizations

### 3. seed-users.ts

Seeds users including 1 SuperAdmin and configurable regular users.

**Features:**
- Creates 1 SuperAdmin user
- Creates 10,000 regular users (configurable)
- Hashes passwords using bcrypt
- Assigns users to random organizations
- Ensures unique emails and usernames
- Batch processing for performance

**SuperAdmin:**
- Username: `superadmin`
- Email: `superadmin@{domain}`
- Password: Custom (via flag) or auto-generated
- **Credentials printed to stdout once after creation**

**Regular Users:**
- Usernames: `john.doe1`, `jane.smith2`, etc.
- Emails: `user1@{domain}`, `user2@{domain}`, etc.
- Default password: `Password123` (hashed with bcrypt)
- Status: 90% active, 5% pending, 5% inactive
- Assigned to random organizations
- Default role: ORG_USER

**Usage:**
```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 10000 --batch-size 500 --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 1000 --seed-superadmin-password "MySecurePass123" --domain "mycompany.com" --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --dry-run
```

**Options:**
- `--count <n>` - Number of regular users to seed (default: 10000)
- `--batch-size <n>` - Batch size for bulk operations (default: 500)
- `--seed-superadmin-password <password>` - Custom SuperAdmin password
- `--domain <domain>` - Email domain (default: example.com)
- `--confirm` - Required for actual database writes
- `--dry-run` - Preview without writing to database
- `--drop` - Drop existing users before seeding (requires --confirm)
- `--skip-if-exists` - Skip users that already exist

**Expected Duration:** 30-60 seconds for 10,000 users

**Security Note:** SuperAdmin password is printed to stdout only once. Save it immediately!

### 4. seed-relations.ts

Creates relationships between users, roles, and organizations.

**Features:**
- Assigns ORG_ADMIN role to 1-2 users per organization
- Creates OrganizationMember entries for all users
- Assigns WAREHOUSE_MANAGER role for orgs with warehouses
- Randomly assigns INVENTORY_VIEWER and REPORT_VIEWER roles (15% of users)
- Batch processing for performance

**Usage:**
```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --batch-size 100 --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --drop --confirm
```

**Options:**
- `--batch-size <n>` - Batch size for bulk operations (default: 100)
- `--confirm` - Required for actual database writes
- `--dry-run` - Preview without writing to database
- `--drop` - Drop existing OrganizationMember entries before seeding (requires --confirm)
- `--skip-if-exists` - Skip relationships that already exist

**Expected Duration:** 20-40 seconds for 10,000 users in 500 organizations

**Prerequisites:** Must run seed-roles, seed-organizations, and seed-users first!

### 5. seed-all.ts

Master script that runs all seed operations in sequence.

**Usage:**
```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts --skip-roles --skip-organizations
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts --user-count 5000 --org-count 250
```

**Options:**
- All options from individual scripts
- `--skip-roles` - Skip role seeding
- `--skip-organizations` - Skip organization seeding
- `--skip-users` - Skip user seeding
- `--skip-relations` - Skip relationship seeding
- `--user-count <n>` - Number of users to create
- `--org-count <n>` - Number of organizations to create

**Expected Duration:** 1-2 minutes for full seed (500 orgs + 10,000 users)

## CLI Options

### Common Options (All Scripts)

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--confirm` | Confirm destructive operations | false | `--confirm` |
| `--dry-run` | Preview without database writes | false | `--dry-run` |
| `--drop` | Drop existing data before seeding | false | `--drop --confirm` |

### Counting Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--count <n>` | Number of items to seed | varies | `--count 1000` |
| `--batch-size <n>` | Batch size for operations | varies | `--batch-size 500` |
| `--limit <n>` | Limit number of items | none | `--limit 100` |

### User-Specific Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--seed-superadmin-password <p>` | Custom SuperAdmin password | auto-generated | `--seed-superadmin-password "Secure123"` |
| `--domain <domain>` | Email domain for users | example.com | `--domain mycompany.com` |

### Organization-Specific Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--hierarchy` | Create hierarchical orgs | false | `--hierarchy` |

### Relationship-Specific Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--skip-if-exists` | Skip existing relationships | false | `--skip-if-exists` |

## Usage Examples

### Development Setup

```bash
# Initial database setup with small dataset
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts \
  --org-count 50 \
  --user-count 500 \
  --confirm

# Add custom SuperAdmin password
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts \
  --count 0 \
  --seed-superadmin-password "DevAdmin123" \
  --confirm
```

### Staging Environment

```bash
# Full staging data with realistic volumes
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts \
  --org-count 500 \
  --user-count 10000 \
  --domain staging.mycompany.com \
  --confirm
```

### Testing Specific Scenarios

```bash
# Test role assignments
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --confirm

# Test with hierarchy
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts \
  --count 100 \
  --hierarchy \
  --confirm
```

### Preview Before Running

```bash
# Dry run to see what would happen
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts --dry-run
```

### Reset and Re-seed

```bash
# Drop all and re-seed (DESTRUCTIVE!)
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts \
  --drop \
  --confirm \
  --org-count 500 \
  --user-count 10000
```

## Performance & Resource Usage

### Expected Performance

| Script | Records | Duration | Memory | Notes |
|--------|---------|----------|--------|-------|
| seed-roles | 7 | < 1s | < 10 MB | Very fast |
| seed-organizations | 500 | 2-5s | 50-100 MB | Depends on batch size |
| seed-users | 10,000 | 30-60s | 200-400 MB | Password hashing is CPU-intensive |
| seed-relations | 10,000+ | 20-40s | 100-200 MB | Depends on user count |
| **Total** | **~20,000** | **1-2 min** | **400-600 MB** | Full seed |

### Optimization Tips

1. **Increase batch size** for faster writes (but uses more memory)
   ```bash
   --batch-size 1000  # Default is 100-500
   ```

2. **Reduce user count** for development
   ```bash
   --user-count 1000  # Instead of 10,000
   ```

3. **Skip unnecessary seeds**
   ```bash
   --skip-warehouses --skip-wards  # In seed-all.ts
   ```

4. **Run on machine with good CPU** - Password hashing is CPU-intensive

### Resource Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 2 GB free
- MongoDB: Running and accessible
- Disk: 100 MB free for reports

**Recommended:**
- CPU: 4+ cores
- RAM: 4 GB free
- MongoDB: Dedicated instance
- Disk: 500 MB free

## Safety & Best Practices

### Before Running

1. **Backup your database** if running against production-like data
   ```bash
   mongodump --db open_erp --out /backup/before-seed
   ```

2. **Test with dry-run first**
   ```bash
   ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts --dry-run
   ```

3. **Use small counts for initial testing**
   ```bash
   --org-count 10 --user-count 100
   ```

### During Execution

1. **Monitor progress** - Scripts log progress every 1000 items or 5 seconds
2. **Watch for errors** - Scripts continue on individual errors but report them
3. **Save SuperAdmin credentials** - Printed to stdout only once!

### After Running

1. **Review the report** - Check `scripts/seeds/reports/` for execution summary
2. **Verify counts** - Use MongoDB compass or shell to verify data
3. **Test authentication** - Try logging in with SuperAdmin and regular users

### Safety Features

- **Requires --confirm** for destructive operations
- **Idempotent** - Safe to run multiple times
- **Batch processing** - Prevents memory issues
- **Error handling** - Continues on individual errors
- **Transaction safety** - Uses atomic upsert operations
- **No hard-coded credentials** - Passwords are hashed and configurable

### What NOT to Do

❌ **Don't** run with --drop in production
❌ **Don't** use the default passwords in production
❌ **Don't** seed directly to production database
❌ **Don't** ignore the SuperAdmin password output
❌ **Don't** run without --dry-run first in new environments

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Errors

**Problem:** `MongoServerError: bad auth`

**Solution:**
```bash
# Check .env file
MONGODB_USER=erp_user
MONGODB_PASS=erp_password
MONGODB_AUTH_SOURCE=admin

# Test connection
mongo --host localhost --port 27017 -u erp_user -p erp_password --authenticationDatabase admin
```

#### 2. Duplicate Key Errors

**Problem:** `E11000 duplicate key error`

**Solution:**
```bash
# Drop and re-seed
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --drop --confirm

# Or skip existing
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --skip-if-exists
```

#### 3. Memory Issues

**Problem:** `JavaScript heap out of memory`

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or reduce batch size
--batch-size 100
```

#### 4. Slow Performance

**Problem:** Scripts taking too long

**Solution:**
```bash
# Increase batch size
--batch-size 1000

# Reduce count
--user-count 1000

# Check MongoDB indexes
db.users.getIndexes()
```

#### 5. SuperAdmin Already Exists

**Problem:** `Duplicate user: superadmin@example.com`

**Solution:**
```bash
# Skip if exists
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --skip-if-exists

# Or drop and re-create
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --drop --confirm
```

### Debug Mode

Enable verbose logging by setting environment variable:
```bash
DEBUG=seed:* ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts
```

### Getting Help

1. Check the logs in `scripts/seeds/reports/`
2. Review the README in `scripts/seeds/`
3. Check test output: `npm test -- scripts/seeds/__tests__/`
4. Review this guide

## Testing

### Unit Tests

Test utility functions without database:

```bash
npm test -- scripts/seeds/__tests__/seed-utils.spec.ts
```

**Coverage:**
- CLI argument parsing
- Password generation
- Batch creation
- Validation logic
- Progress logging

**Status:** ✅ 28 tests passing

### Integration Tests

Test database operations with in-memory MongoDB:

```bash
npm test -- scripts/seeds/__tests__/seed-integration.spec.ts
```

**Coverage:**
- Role seeding and upserts
- Organization seeding
- User seeding with authentication
- Relationship creation
- Uniqueness constraints

**Status:** ⚠️ Requires internet connection to download MongoDB binary

**Note:** Integration tests may fail in sandboxed/CI environments. Use manual testing against real MongoDB instead.

### Manual Testing

Test against real MongoDB instance:

```bash
# 1. Test with dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts --dry-run

# 2. Test with small counts
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts \
  --org-count 5 \
  --user-count 20 \
  --confirm

# 3. Verify data
mongo open_erp --eval "db.roles.count()"
mongo open_erp --eval "db.organizations.count()"
mongo open_erp --eval "db.users.count()"
mongo open_erp --eval "db.organization_members.count()"

# 4. Test idempotency (run again)
ts-node -r tsconfig-paths/register scripts/seeds/seed-all.ts \
  --org-count 5 \
  --user-count 20 \
  --confirm

# 5. Clean up
mongo open_erp --eval "db.roles.deleteMany({})"
mongo open_erp --eval "db.organizations.deleteMany({})"
mongo open_erp --eval "db.users.deleteMany({})"
mongo open_erp --eval "db.organization_members.deleteMany({})"
```

## Reports

All seed operations generate JSON reports in `scripts/seeds/reports/` directory.

### Report Structure

```json
{
  "scriptName": "seed-users",
  "timestamp": "2024-01-22T12:34:56.789Z",
  "options": {
    "count": 10000,
    "batchSize": 500,
    "confirm": true
  },
  "stats": {
    "total": 10001,
    "inserted": 10001,
    "updated": 0,
    "skipped": 0,
    "errors": 0,
    "errorDetails": []
  },
  "duration": 45678,
  "success": true
}
```

### Report Files

Reports are named with timestamp and script name:
- `2024-01-22T12-34-56-789Z-seed-roles-report.json`
- `2024-01-22T12-35-12-345Z-seed-organizations-report.json`
- `2024-01-22T12-36-45-678Z-seed-users-report.json`
- `2024-01-22T12-38-23-456Z-seed-relations-report.json`

### Reviewing Reports

```bash
# List all reports
ls -lh scripts/seeds/reports/

# View latest report
cat scripts/seeds/reports/*.json | tail -1 | jq .

# Count errors in all reports
cat scripts/seeds/reports/*.json | jq '.stats.errors' | paste -sd+ | bc
```

## Advanced Topics

### Custom Email Domains

Generate users with company-specific email domains:

```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts \
  --domain mycompany.com \
  --confirm
```

Result: `user1@mycompany.com`, `user2@mycompany.com`, etc.

### Hierarchical Organizations

Create parent-child organization relationships:

```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts \
  --count 500 \
  --hierarchy \
  --confirm
```

Result:
- 20% HOLDING type (parent companies)
- 30% BRANCH type (subsidiaries)
- 50% other types (independent)

### Skip Existing Data

Preserve existing data and only add new:

```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts \
  --skip-if-exists \
  --confirm
```

### Custom SuperAdmin Password

Set a specific password for SuperAdmin:

```bash
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts \
  --seed-superadmin-password "MySecurePassword123!" \
  --confirm
```

⚠️ **Warning:** Password is still printed to stdout. Save it securely!

## Conclusion

The seed scripts provide a robust, performant, and safe way to populate your database with test data. Follow the best practices in this guide to ensure smooth operation and avoid common pitfalls.

For questions or issues, refer to the troubleshooting section or check the test documentation in `scripts/seeds/__tests__/README.md`.

Happy seeding! 🌱
