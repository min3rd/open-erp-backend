# MongoDB Storage Implementation

This document describes the MongoDB storage implementation using Mongoose ODM in the Open ERP Backend project.

## Overview

The project uses MongoDB as the primary database with Mongoose as the Object Document Mapper (ODM). The implementation includes:
- Database connection with retry logic and connection pooling
- User schema with validation, indexes, and soft-delete functionality
- Repository pattern for data access
- Migration and seeding scripts
- Docker Compose integration for local development

## Configuration

### Environment Variables

Configure MongoDB connection in `.env` file (see `.env.example` for template):

```env
# MongoDB connection URI
MONGODB_URI=mongodb://localhost:27017

# MongoDB authentication
MONGODB_USER=erp_user
MONGODB_PASS=erp_password

# MongoDB database name
MONGODB_DB=open_erp

# MongoDB connection options
MONGODB_AUTH_SOURCE=admin
MONGODB_REPLICA_SET=
MONGODB_USE_TLS=false

# Connection pool settings
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

# Timeouts (milliseconds)
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_CONNECT_TIMEOUT=10000
MONGODB_SOCKET_TIMEOUT=45000
```

### Connection Features

The database connection includes:
- **Automatic retry**: Reconnects automatically on connection failure (up to 5 attempts with 3s delay)
- **Connection pooling**: Maintains 2-10 connections for optimal performance
- **TLS/SSL support**: Configurable for production environments
- **Replica set support**: Ready for high-availability deployments
- **Authentication**: Supports username/password authentication

## Schema Design

### User Schema

The User schema (`apps/user/src/schemas/user.schema.ts`) includes:

**Fields:**
- `username` (string, required, unique, 3-50 chars)
- `email` (string, required, unique, validated)
- `firstName` (string, optional, max 100 chars)
- `lastName` (string, optional, max 100 chars)
- `status` (enum: 'active', 'inactive', 'suspended')
- `deletedAt` (date, for soft delete)
- `lastLoginAt` (date, tracks login activity)
- `metadata` (map, for extensibility)
- `createdAt` (date, auto-generated)
- `updatedAt` (date, auto-updated)

**Indexes:**
- Unique indexes on `username` and `email`
- Compound indexes for common queries: `(email, status)`, `(username, status)`
- Text index for full-text search across username, email, firstName, lastName
- TTL index on `deletedAt` for automatic cleanup after 90 days

**Virtuals:**
- `fullName`: Computed from firstName and lastName
- `isDeleted`: Boolean indicating soft-delete status

**Methods:**
- `softDelete()`: Soft deletes the user (sets deletedAt)
- `restore()`: Restores a soft-deleted user

### Schema Best Practices

- **Validation**: All fields have appropriate validation rules
- **Indexes**: Optimized for common query patterns
- **Soft Delete**: Preserves data integrity with TTL cleanup
- **Timestamps**: Automatic tracking of creation and updates
- **Virtuals**: Computed fields for derived data
- **Versioning**: Schema changes should be handled via migrations

## Repository Pattern

The `UserRepository` (`apps/user/src/repositories/user.repository.ts`) provides:

**Methods:**
- `create(data)`: Create a new user
- `findAll()`: Find all users (excludes soft-deleted)
- `findById(id)`: Find user by ID
- `findByEmail(email)`: Find user by email
- `findByUsername(username)`: Find user by username
- `update(id, data)`: Update user
- `delete(id)`: Soft delete user
- `hardDelete(id)`: Permanently delete user
- `restore(id)`: Restore soft-deleted user
- `search(query)`: Full-text search
- `count()`: Count users
- `updateLastLogin(id)`: Update last login timestamp

## Migrations

### Setup

Migrations are managed using `migrate-mongo`. Configuration is in `migrate-mongo-config.js`.

**Note**: There is a known issue with `migrate-mongo` and authentication. If you encounter authentication errors when running migrations, you can run migrations manually using Node.js:

```bash
# Run migration manually
node -e "
require('dotenv').config();
const {MongoClient} = require('mongodb');
const migration = require('./migrations/YOUR_MIGRATION_FILE.js');

async function run() {
  const uri = 'mongodb://\${process.env.MONGODB_USER}:\${process.env.MONGODB_PASS}@localhost:27017/\${process.env.MONGODB_DB}?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    await migration.up(db, client);
    console.log('Migration completed');
  } finally {
    await client.close();
  }
}
run();
"
```

Or start MongoDB without authentication for development (not recommended for production).

### Commands

```bash
# Check migration status
npm run db:migrate:status

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:down

# Create new migration
npx migrate-mongo create <migration-name>
```

If migrate-mongo fails with authentication errors, use the manual script approach above.

### Example Migration

The initial migration (`migrations/20251229050556-create-users-collection.js`) creates:
- Users collection with validation rules
- All required indexes
- Text search capabilities

## Seeding

### Seed Data

The seed script (`scripts/seed.js`) populates the database with sample users.

### Running Seeds

```bash
# Run seed script
npm run db:seed
```

The script:
1. Connects to MongoDB using environment variables
2. Clears existing users
3. Inserts 5 sample users with different statuses
4. Displays inserted users

## Docker Setup

### Local Development

The `docker-compose.yml` includes MongoDB service:

```yaml
mongodb:
  image: mongo:7.0
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: erp_user
    MONGO_INITDB_ROOT_PASSWORD: erp_password
    MONGO_INITDB_DATABASE: open_erp
  volumes:
    - mongodb_data:/data/db
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Running with Docker

```bash
# Start all services including MongoDB
docker compose up -d

# View logs
docker compose logs -f mongodb

# Access MongoDB shell
docker exec -it erp-mongodb mongosh -u erp_user -p erp_password --authenticationDatabase admin

# Stop services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Integration Testing

### MongoDB Memory Server

For integration tests, use `mongodb-memory-server` (installed as dev dependency). This creates an in-memory MongoDB instance for testing.

**Note**: `mongodb-memory-server` requires downloading MongoDB binaries on first run. If you're in an environment with restricted internet access, you may need to use a real MongoDB instance for testing instead.

### Test Example

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  // Use uri for test database connection
});

afterAll(async () => {
  await mongod.stop();
});
```

### Quick Connection Test

Use the provided test script to verify MongoDB connection and CRUD operations:

```bash
# Test MongoDB connection and CRUD operations
npm run db:test
```

This script will:
1. Connect to MongoDB
2. Create a test user
3. Read the user
4. Update the user
5. Soft delete the user
6. Clean up test data

Sample output:
```
🔌 Connecting to MongoDB...
✅ Connected successfully

📝 Testing CREATE operation...
✅ User created with ID: 6578f1a2b3c4d5e6f7g8h9i0

📖 Testing READ operation...
✅ User found

✏️  Testing UPDATE operation...
✅ Updated 1 user(s)

✅ All MongoDB CRUD operations completed successfully!
```

### Full Integration Test Suite

A complete integration test suite is available in `apps/user/test/user.repository.integration.spec.ts`. It tests:
- User creation with validation
- Duplicate email/username handling
- Finding users by various criteria
- Updating user information
- Soft delete and restore functionality
- Counting users

To run the integration tests (requires MongoDB binaries or real MongoDB instance):

```bash
npm test -- apps/user/test/user.repository.integration.spec.ts
```

## Usage Examples

### Creating a User

```typescript
const user = await userRepository.create({
  username: 'johndoe',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  status: 'active',
});
```

### Querying Users

```typescript
// Find by ID
const user = await userRepository.findById(userId);

// Find by email
const user = await userRepository.findByEmail('john@example.com');

// Search users
const users = await userRepository.search('john');

// Get all active users (soft-deleted excluded by default)
const activeUsers = await userRepository.findAll();
```

### Updating a User

```typescript
const updatedUser = await userRepository.update(userId, {
  firstName: 'Johnny',
  status: 'inactive',
});
```

### Soft Deleting and Restoring

```typescript
// Soft delete
await userRepository.delete(userId);

// Restore
await userRepository.restore(userId);

// Hard delete (permanent)
await userRepository.hardDelete(userId);
```

## Performance Considerations

1. **Connection Pooling**: Maintains 2-10 connections to balance performance and resources
2. **Indexes**: All common query patterns are indexed
3. **Text Search**: Full-text search index for user discovery
4. **TTL Index**: Automatic cleanup of old soft-deleted records
5. **Lean Queries**: Use `.lean()` for read-only operations when documents don't need methods

## Security Best Practices

1. **Authentication**: Always use authentication in production
2. **TLS/SSL**: Enable TLS for production environments
3. **Input Validation**: Schema validation prevents invalid data
4. **Injection Prevention**: Mongoose protects against NoSQL injection
5. **Connection Strings**: Never commit credentials to version control
6. **Network Isolation**: Use Docker networks for container-to-container communication

## Monitoring and Maintenance

### Health Checks

The MongoDB service includes health checks in Docker Compose.

### Backup Strategy

For production:
1. Use MongoDB Atlas automated backups, or
2. Set up regular `mongodump` snapshots
3. Store backups in separate location/region

### Monitoring Queries

```javascript
// Enable profiling (development only)
db.setProfilingLevel(2);

// View slow queries
db.system.profile.find().sort({ts: -1}).limit(5);

// Check index usage
db.users.aggregate([{$indexStats: {}}]);
```

## Troubleshooting

### Connection Issues

```bash
# Check MongoDB is running
docker ps | grep mongodb

# Check logs
docker logs erp-mongodb

# Test connection
mongosh mongodb://erp_user:erp_password@localhost:27017/open_erp --authenticationDatabase admin
```

### Migration Issues

```bash
# Check migration status
npm run db:migrate:status

# Force unlock (if migration lock is stuck)
db.changelog_lock.deleteMany({});
```

## References

- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/article/mongodb-schema-design-best-practices/)
- [migrate-mongo](https://github.com/seppevs/migrate-mongo)
- [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server)
- [Docker Hub - MongoDB](https://hub.docker.com/_/mongo)

## Next Steps

1. **Add more schemas**: Extend to other entities (Products, Orders, etc.)
2. **Implement authentication**: Integrate with Auth service
3. **Add aggregation pipelines**: For complex reporting queries
4. **Set up monitoring**: Use MongoDB Compass or cloud monitoring
5. **Configure replica set**: For high availability in production
6. **Implement caching**: Consider Redis for frequently accessed data
