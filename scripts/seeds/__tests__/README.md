# Seed Scripts Tests

This directory contains tests for the database seed scripts.

## Test Files

1. **seed-utils.spec.ts** - Unit tests for seed utility functions
   - Tests CLI argument parsing
   - Tests password generation
   - Tests batch creation
   - Tests validation logic
   - ✅ Can run in any environment

2. **seed-integration.spec.ts** - Integration tests for seed operations
   - Tests actual database operations with in-memory MongoDB
   - Tests role, organization, user, and relationship seeding
   - ⚠️ Requires internet connection to download MongoDB binary
   - May fail in sandboxed/restricted environments (CI, Docker)

## Running Tests

### Run Unit Tests Only (Recommended)
```bash
npm test -- scripts/seeds/__tests__/seed-utils.spec.ts
```

### Run All Tests (Including Integration)
```bash
npm test -- scripts/seeds/__tests__/
```

Note: Integration tests may fail in restricted environments. This is expected and does not indicate a problem with the seed scripts.

## Integration Test Requirements

Integration tests use `mongodb-memory-server` which:
- Downloads MongoDB binary on first run
- Requires internet connection
- May fail in sandboxed environments
- Is primarily for local development

If integration tests fail due to MongoDB Memory Server issues, you can still:
1. Run unit tests to validate utility functions
2. Test seed scripts against a real MongoDB instance
3. Use the `--dry-run` flag to validate seed scripts without database

## Testing Seed Scripts Manually

You can test the actual seed scripts against a real MongoDB instance:

```bash
# Test with dry-run (no database writes)
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 10 --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 100 --dry-run
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --dry-run

# Test with real database (ensure MongoDB is running)
ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts --count 10 --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts --count 100 --confirm
ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts --confirm
```
