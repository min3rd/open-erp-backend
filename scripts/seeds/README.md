# Database Seed Scripts

This directory contains seed scripts for populating the database with Vietnamese administrative divisions (provinces, wards), warehouse data, system roles, and organization data.

## Overview

The seed scripts are designed to:
- Be **idempotent** - can be run multiple times safely using upsert operations
- Support **dry-run mode** - validate without making database changes
- Handle **MongoDB authentication** properly
- Provide detailed **logging and statistics**
- Work with **GeoJSON data** for geographic information
- Generate realistic fake data using **@faker-js/faker**

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
- `--skip-roles` - Skip roles seeding
- `--skip-organizations` - Skip organizations seeding
- `--skip-warehouse-types` - Skip warehouse types seeding
- `--skip-warehouses` - Skip warehouses seeding
- `--skip-relations` - Skip relationships seeding
- `--warehouse-count <n>` - Number of sample warehouses (default: 20)
- `--organization-count <n>` - Number of organizations (default: 500)

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

### 6. seed-roles.ts - System Roles

Seeds predefined system roles for RBAC.

**Usage:**
```bash
npm run db:seed:roles

# Or with ts-node
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts

# With options
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --dry-run
```

**Options:**
- `--drop` - Drop existing roles before seeding (requires --confirm)
- `--confirm` - Confirm destructive operations
- `--dry-run` - Validate without writing to database

**System Roles:**
1. SUPER_ADMIN - System administrator with all permissions
2. ORG_ADMIN - Organization administrator
3. ORG_USER - Regular organization user
4. WAREHOUSE_MANAGER - Warehouse management role
5. INVENTORY_VIEWER - View-only inventory access
6. REPORT_VIEWER - View-only report access
7. GUEST - Limited guest access

### 7. seed-organizations.ts - Sample Organizations

Generates sample organization records with realistic data using @faker-js/faker.

**Usage:**
```bash
npm run db:seed:organizations

# Or with ts-node
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts

# With options
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 500
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 100 --batch-size 50
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --hierarchy
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --dry-run
```

**Options:**
- `--count <n>` - Number of organizations to create (default: 500)
- `--batch-size <n>` - Number of orgs to process per batch (default: 100)
- `--drop` - Drop existing organizations before seeding (requires --confirm)
- `--confirm` - Confirm destructive operations
- `--dry-run` - Validate without writing to database
- `--hierarchy` - Create distribution with HOLDING (20%), BRANCH (30%), others (50%)

**Features:**
- Generates realistic company data using @faker-js/faker
- Unique tax IDs (ORG0000000001, ORG0000000002, etc.)
- Realistic company names, addresses, contact information
- Founded dates within the past 20 years
- Status distribution: 85% active, 10% inactive, 5% other statuses
- Optional hierarchy distribution of organization types
- Batch processing for large datasets
- Progress logging during execution
- Creates JSON reports in reports/ directory

**Generated Fields:**
- `taxId` - Unique tax ID (e.g., ORG0000000001)
- `name` - Company name from faker
- `internationalName` - Optional international name
- `type` - Organization type (HOLDING, COMPANY, JOINT_VENTURE, PARTNER, BRANCH)
- `headquartersAddress` - Street address
- `legalRepresentative` - Person full name
- `contactPhone` - Phone number
- `contactEmail` - Company email
- `foundedDate` - Random date in past 20 years
- `status` - Active, inactive, suspended, or pending
- `country` - 'VN' (Vietnam)
- `description` - Company catchphrase
- `website` - Company URL
- `createdBy` - System user ObjectId (placeholder if no user exists)

**Example Output:**
```json
{
  "taxId": "ORG0000000001",
  "name": "Schoen, Luettgen and Schaden",
  "type": "company",
  "headquartersAddress": "456 Oak Avenue, Suite 789",
  "legalRepresentative": "John Doe",
  "contactPhone": "+1-555-0123",
  "contactEmail": "contact@schoenluettgen.com",
  "foundedDate": "2015-06-15T00:00:00.000Z",
  "status": "active",
  "country": "VN",
  "description": "Innovative solutions for modern businesses",
  "website": "https://schoenluettgen.com"
}
```

### 8. seed-users.ts - Sample Users

Generates sample user accounts with realistic data using @faker-js/faker, including 1 SuperAdmin and N regular users.

**Usage:**
```bash
npm run db:seed:users

# Or with ts-node
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts

# With options
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 10000
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 100 --batch-size 50
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --seed-superadmin-password "MySecretPass123"
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --domain "mycompany.com"
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --skip-if-exists
```

**Options:**
- `--count <n>` - Number of regular users to create (default: 10000)
- `--batch-size <n>` - Number of users to process per batch (default: 500)
- `--drop` - Drop existing users before seeding (requires --confirm)
- `--confirm` - Confirm destructive operations
- `--dry-run` - Validate without writing to database
- `--seed-superadmin-password <p>` - Password for SuperAdmin (generates strong random if not provided)
- `--domain <domain>` - Email domain for users (default: example.com)
- `--skip-if-exists` - Skip users that already exist by email

**Features:**
- Creates 1 SuperAdmin user with global privileges (SUPER_ADMIN role)
- Generates N regular users with faker-generated data (ORG_USER role)
- All passwords are hashed using bcrypt (10 rounds)
- SuperAdmin credentials are printed to stdout ONCE after creation
- Unique email and username generation with deduplication logic
- Random organization assignment from existing organizations
- Status distribution: 90% active, 5% pending, 5% inactive
- Phone numbers for 70% of users
- Batch processing with configurable batch size
- Progress logging during execution
- Creates JSON reports in reports/ directory
- Idempotent with upsert support

**SuperAdmin User:**
- `username`: "superadmin"
- `email`: "superadmin@{domain}"
- `password`: From --seed-superadmin-password OR auto-generated strong password (16 chars)
- `displayName`: "Super Administrator"
- `fullName`: "Super Administrator"
- `status`: "active"
- `verifiedAt`: Current date
- `roleAssignments`: SUPER_ADMIN role
- `organizationId`: null (global scope)

**Regular Users:**
- `username`: Unique faker-generated username (e.g., john.doe123)
- `email`: Unique email with domain override (e.g., user1@example.com)
- `password`: Hashed "Password123" (common password for dev/test)
- `displayName`: Faker full name
- `fullName`: Faker full name
- `firstName`: Faker first name
- `lastName`: Faker last name
- `phone`: Faker phone (70% of users)
- `status`: 90% active, 5% pending, 5% inactive
- `verifiedAt`: Current date for active users, null for pending
- `organizationId`: Randomly assigned from existing organizations
- `roleAssignments`: ORG_USER role

**Generated Fields:**
- `username` - Unique username (3-50 chars)
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `firstName` - First name
- `lastName` - Last name
- `fullName` - Full name
- `displayName` - Display name
- `phone` - Phone number (optional)
- `status` - User status (active, pending, inactive)
- `verifiedAt` - Verification timestamp
- `organizationId` - Associated organization
- `roleAssignments` - Array of role assignments with roleId, grantedAt
- `specialPermissions` - Array of special permissions (empty by default)

**Example SuperAdmin Output:**
```
═══════════════════════════════════════════════════════════
SuperAdmin credentials:
  Email:    superadmin@example.com
  Password: Xk9#mP2$vL4@nQ7*
═══════════════════════════════════════════════════════════
```

**Example Regular User:**
```json
{
  "username": "john.doe123",
  "email": "john.doe123@example.com",
  "password": "$2b$10$hashed...",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "displayName": "John Doe",
  "phone": "+1-555-0123",
  "status": "active",
  "verifiedAt": "2025-01-22T00:00:00.000Z",
  "organizationId": "507f1f77bcf86cd799439011",
  "roleAssignments": [
    {
      "roleId": "507f191e810c19729de860ea",
      "grantedAt": "2025-01-22T00:00:00.000Z"
    }
  ],
  "specialPermissions": []
}
```

**Performance:**
- ~2000-5000 users/second (varies by hardware)
- Batch processing prevents memory issues
- Progress logging every 1000 records or 5 seconds

**Important Notes:**
- ⚠️ SuperAdmin credentials are printed ONLY ONCE - save them immediately!
- ⚠️ Regular users all share the same password "Password123" (for dev/test only)
- ⚠️ Always use --dry-run first to validate before inserting real data
- ⚠️ Requires seed-roles.ts to be run first (needs SUPER_ADMIN and ORG_USER roles)
- ⚠️ Optionally run seed-organizations.ts first for organization assignments

### 9. seed-relations.ts - User-Role-Organization Relationships

Creates and manages relationships between users, roles, and organizations, including:
- Organization admin assignments
- Organization member entries
- Warehouse manager assignments
- Special role assignments (viewers)

**Usage:**
```bash
npm run db:seed:relations

# Or with ts-node
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts

# With options
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --batch-size 100
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --skip-if-exists
```

**Options:**
- `--batch-size <n>` - Number of operations per batch (default: 100)
- `--drop` - Drop existing OrganizationMember entries before seeding (requires --confirm)
- `--confirm` - Confirm destructive operations
- `--dry-run` - Validate without writing to database
- `--skip-if-exists` - Skip relationships that already exist

**Features:**
- **Idempotent** - Safe to run multiple times, checks existing relationships
- Uses `$addToSet` for user role assignments to avoid duplicates
- Uses upsert for OrganizationMember documents
- Batch processing for efficient bulk updates
- Progress logging for long-running operations
- Generates detailed JSON reports

**Relationship Logic:**

1. **Organization Admins:**
   - Selects 1-2 users (15% of org users, min 1, max 2) as admins
   - Updates User.roleAssignments to add ORG_ADMIN role
   - Creates/updates OrganizationMember with roles: ['admin', 'member']
   - Status: 'active', joinedAt: current date

2. **Organization Members:**
   - Creates OrganizationMember entry for all users in organization
   - roles: ['member'] for regular ORG_USER role
   - Status: 'active', joinedAt: current date
   - Required createdBy field set to system user

3. **Warehouse Managers:**
   - For organizations with warehouses, assigns 1-2 users as WAREHOUSE_MANAGER
   - Updates User.roleAssignments to add WAREHOUSE_MANAGER role
   - Prefers non-admin users for this role
   - Checks warehouses collection for organization

4. **Special Roles:**
   - Randomly assigns INVENTORY_VIEWER and/or REPORT_VIEWER to 10-20% of users
   - Updates User.roleAssignments only
   - No OrganizationMember changes needed
   - Each user may get 0, 1, or 2 special roles

**Generated Relationships:**

OrganizationMember Entry:
```json
{
  "organizationId": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "roles": ["admin", "member"],
  "status": "active",
  "joinedAt": "2025-01-22T00:00:00.000Z",
  "createdBy": "507f191e810c19729de860eb",
  "updatedBy": "507f191e810c19729de860eb"
}
```

User.roleAssignments Update:
```json
{
  "roleAssignments": [
    {
      "roleId": "507f191e810c19729de860ec",
      "grantedAt": "2025-01-22T00:00:00.000Z",
      "grantedBy": "507f191e810c19729de860eb"
    }
  ]
}
```

**Statistics Tracked:**
- Organization admins created
- Organization members created
- Warehouse managers assigned
- Special roles assigned
- Total updated, inserted, skipped, errors

**Example Output:**
```
============================================================
SEEDING RELATIONSHIPS
============================================================
Loading roles...
✓ Loaded 7 roles
  - ORG_ADMIN: 507f191e810c19729de860ea
  - ORG_USER: 507f191e810c19729de860eb
  ...

Loading organizations...
✓ Loaded 500 active organizations

Loading users...
✓ Loaded 9500 users with organization assignments

Processing organizations...
  Progress: 500/500 (100.0%) - 45.2s elapsed
  Completed: 500/500 - 45.2s total

Updating user role assignments...
  Progress: 15/15 (100.0%) - 2.3s elapsed
  Completed: 15/15 - 2.3s total

Upserting OrganizationMember entries...
  Progress: 95/95 (100.0%) - 8.5s elapsed
  Completed: 95/95 - 8.5s total

Relationship Statistics:
  Organization Admins: 750
  Organization Members: 9500
  Warehouse Managers: 25
  Special Roles Assigned: 1425

Statistics:
  Total: 9500
  Inserted: 9500
  Updated: 2200
  Skipped: 0
  Errors: 0
Duration: 56.02s

✓ Report saved to: reports/2025-01-22T12-30-00-000Z-seed-relations-report.json
```

**Prerequisites:**
- ⚠️ Requires seed-roles.ts to be run first (needs ORG_ADMIN, ORG_USER, WAREHOUSE_MANAGER, INVENTORY_VIEWER, REPORT_VIEWER)
- ⚠️ Requires seed-organizations.ts to be run first (needs active organizations)
- ⚠️ Requires seed-users.ts to be run first (needs users with organizationId assignments)
- ⚠️ Optionally seed-warehouses.ts for warehouse manager assignments

**Important Notes:**
- Always safe to re-run - checks existing relationships
- Uses `$addToSet` to prevent duplicate role assignments
- Uses upsert to handle existing OrganizationMember entries
- Progress logging for visibility into long-running operations
- Detailed error reporting for troubleshooting

## Common Workflows

### Initial Database Setup

```bash
# 1. Ensure MongoDB is running and .env is configured
# 2. Run all seeds
npm run db:seed:all

# Or run individually (in order)
npm run db:seed:provinces
npm run db:seed:wards
npm run db:seed:roles             # Required before users
npm run db:seed:organizations     # Required before users
npm run db:seed:users             # Creates SuperAdmin + regular users
npm run db:seed:warehouse-types
npm run db:seed:warehouses
npm run db:seed:relations         # Creates user-role-organization relationships
```

### Reset and Re-seed

```bash
# Drop and re-seed all (DESTRUCTIVE)
ts-node scripts/seeds/seed-all.ts --drop --confirm

# Or drop and re-seed individually
ts-node scripts/seeds/seed-provinces.ts --drop
ts-node scripts/seeds/seed-wards.ts --drop
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --drop --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --drop --confirm
ts-node scripts/seeds/seed-warehouse-types.ts --drop
ts-node scripts/seeds/seed-warehouses.ts --drop
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --drop --confirm
```

### Testing Before Making Changes

```bash
# Dry run to validate without changes
ts-node scripts/seeds/seed-all.ts --dry-run

# Test with limited data
ts-node scripts/seeds/seed-provinces.ts --limit 5 --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 10 --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 10 --dry-run
ts-node scripts/seeds/seed-warehouses.ts --count 5 --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --dry-run
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

**Roles:**
- Unique index on `{code, scope}`
- Regular indexes on `scope`, `status`

**Organizations:**
- Unique index on `{taxId, country}`
- Regular indexes on `type`, `status`, `name`, `createdBy`
- Text index on `{name, internationalName, description}`

**Warehouses:**
- Unique index on `code`
- 2dsphere index on `location`
- Regular indexes on `type`, `status`, `province.code`, `ward.code`

**Users:**
- Unique index on `email`
- Unique index on `username`
- Compound indexes on `{email, status}`, `{username, status}`, `{organizationId, status}`
- Text index on `{username, email, firstName, lastName, fullName}`
- TTL index on `deletedAt` (90 days expiration for soft-deleted users)

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
