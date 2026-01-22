#!/usr/bin/env ts-node

/**
 * Seed system roles
 *
 * Creates/upserts a set of predefined system roles including:
 * - SUPER_ADMIN: System administrator with all permissions
 * - ORG_ADMIN: Organization administrator
 * - ORG_USER: Regular organization user
 * - WAREHOUSE_MANAGER: Warehouse management role
 * - INVENTORY_VIEWER: View-only inventory access
 * - REPORT_VIEWER: View-only report access
 * - GUEST: Limited guest access
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/seeds/seed-roles.ts [options]
 *
 * Options:
 *   --drop              Drop existing roles before seeding (requires --confirm)
 *   --confirm           Confirm destructive operations
 *   --dry-run           Validate without writing to database
 */

import 'tsconfig-paths/register';
import { connect, connection, Model } from 'mongoose';
import { RoleSchema, Role } from '@shared/schemas/role.schema';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import {
  parseArgs,
  validateDestructiveOps,
  printStats,
  saveReport,
  SeedOptions,
  SeedStats,
  SeedReport,
} from './utils/seed-utils';

require('dotenv').config();

interface RoleDef {
  code: string;
  name: string;
  description: string;
  scope: 'global' | 'organization';
  permissions: string[];
  isSystem: boolean;
}

const SYSTEM_ROLES: RoleDef[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description:
      'System super administrator with unrestricted access to all features and data',
    scope: 'global',
    permissions: [
      'system.manage',
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
      'organizations.create',
      'organizations.read',
      'organizations.update',
      'organizations.delete',
      'warehouses.create',
      'warehouses.read',
      'warehouses.update',
      'warehouses.delete',
      'inventory.create',
      'inventory.read',
      'inventory.update',
      'inventory.delete',
      'reports.read',
      'audit.read',
    ],
    isSystem: true,
  },
  {
    code: 'ORG_ADMIN',
    name: 'Organization Administrator',
    description:
      'Administrator of an organization with full control over organization resources',
    scope: 'organization',
    permissions: [
      'org.manage',
      'org.users.create',
      'org.users.read',
      'org.users.update',
      'org.users.delete',
      'org.roles.assign',
      'org.warehouses.create',
      'org.warehouses.read',
      'org.warehouses.update',
      'org.warehouses.delete',
      'org.inventory.create',
      'org.inventory.read',
      'org.inventory.update',
      'org.inventory.delete',
      'org.reports.read',
    ],
    isSystem: true,
  },
  {
    code: 'ORG_USER',
    name: 'Organization User',
    description: 'Regular user within an organization with standard access',
    scope: 'organization',
    permissions: [
      'org.inventory.read',
      'org.inventory.create',
      'org.warehouses.read',
      'org.reports.read',
    ],
    isSystem: true,
  },
  {
    code: 'WAREHOUSE_MANAGER',
    name: 'Warehouse Manager',
    description:
      'Manager of warehouse operations with inventory management capabilities',
    scope: 'organization',
    permissions: [
      'org.warehouses.read',
      'org.warehouses.update',
      'org.inventory.create',
      'org.inventory.read',
      'org.inventory.update',
      'org.inventory.delete',
      'org.reports.read',
    ],
    isSystem: true,
  },
  {
    code: 'INVENTORY_VIEWER',
    name: 'Inventory Viewer',
    description: 'View-only access to inventory data',
    scope: 'organization',
    permissions: [
      'org.inventory.read',
      'org.warehouses.read',
      'org.reports.read',
    ],
    isSystem: true,
  },
  {
    code: 'REPORT_VIEWER',
    name: 'Report Viewer',
    description: 'View-only access to reports and analytics',
    scope: 'organization',
    permissions: ['org.reports.read'],
    isSystem: true,
  },
  {
    code: 'GUEST',
    name: 'Guest',
    description: 'Limited guest access for external users',
    scope: 'organization',
    permissions: ['org.inventory.read'],
    isSystem: false,
  },
];

/**
 * Connect to MongoDB with proper authentication handling
 */
async function connectToDatabase(): Promise<void> {
  const dbConfig = getDatabaseConfig();
  const mongooseOpts = getMongooseOptions(dbConfig) as any;
  const connectUri = dbConfig.uri;

  const maskedAuth = dbConfig.user ? `${dbConfig.user}:***` : '(no-auth)';
  console.log(`Connecting to MongoDB...`);
  console.log(`  URI: ${connectUri}`);
  console.log(`  Database: ${mongooseOpts.dbName}`);
  console.log(`  Auth: ${maskedAuth}`);

  try {
    await connect(connectUri, {
      dbName: mongooseOpts.dbName,
      auth: mongooseOpts.auth,
      authSource: mongooseOpts.authSource,
      maxPoolSize: mongooseOpts.maxPoolSize,
      minPoolSize: mongooseOpts.minPoolSize,
      serverSelectionTimeoutMS: mongooseOpts.serverSelectionTimeoutMS,
      connectTimeoutMS: mongooseOpts.connectTimeoutMS,
      socketTimeoutMS: mongooseOpts.socketTimeoutMS,
      tls: mongooseOpts.tls,
      tlsAllowInvalidCertificates: mongooseOpts.tlsAllowInvalidCertificates,
      replicaSet: mongooseOpts.replicaSet,
    });
    console.log('✓ Connected to MongoDB');
  } catch (err: any) {
    // Retry with embedded credentials
    console.warn(
      'Initial connection failed, retrying with embedded credentials...',
    );
    const authPart =
      dbConfig.user && dbConfig.pass
        ? `${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.pass)}@`
        : '';
    const hostPart = connectUri.replace('mongodb://', '');
    const retryUri = `mongodb://${authPart}${hostPart}`;

    await connect(retryUri, {
      dbName: mongooseOpts.dbName,
      authSource: mongooseOpts.authSource,
      maxPoolSize: mongooseOpts.maxPoolSize,
      minPoolSize: mongooseOpts.minPoolSize,
      serverSelectionTimeoutMS: mongooseOpts.serverSelectionTimeoutMS,
      connectTimeoutMS: mongooseOpts.connectTimeoutMS,
      socketTimeoutMS: mongooseOpts.socketTimeoutMS,
      tls: mongooseOpts.tls,
      tlsAllowInvalidCertificates: mongooseOpts.tlsAllowInvalidCertificates,
      replicaSet: mongooseOpts.replicaSet,
    });
    console.log('✓ Connected to MongoDB (with embedded credentials)');
  }
}

/**
 * Seed roles
 */
export async function seedRoles(options: SeedOptions = {}): Promise<SeedStats> {
  const startTime = Date.now();
  const stats: SeedStats = {
    total: SYSTEM_ROLES.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log('\n' + '='.repeat(60));
  console.log('SEEDING ROLES');
  console.log('='.repeat(60));
  console.log(`Total roles to seed: ${stats.total}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const RoleModel: Model<Role> = connection.model('Role', RoleSchema);

  // Drop existing roles if requested
  if (options.drop && !options.dryRun) {
    console.log('Dropping existing roles...');
    await RoleModel.deleteMany({});
    console.log('✓ Existing roles dropped');
  }

  // Process each role
  for (const roleDef of SYSTEM_ROLES) {
    try {
      if (options.dryRun) {
        console.log(`[DRY RUN] Would upsert role: ${roleDef.code}`);
        stats.inserted++;
      } else {
        const result = await RoleModel.updateOne(
          { code: roleDef.code, scope: roleDef.scope },
          {
            $set: {
              name: roleDef.name,
              description: roleDef.description,
              scope: roleDef.scope,
              permissions: roleDef.permissions,
              isSystem: roleDef.isSystem,
              status: 'active',
            },
            $setOnInsert: {
              organizationId: null,
            },
          },
          { upsert: true },
        );

        if (result.upsertedCount > 0) {
          console.log(`✓ Inserted role: ${roleDef.code}`);
          stats.inserted++;
        } else if (result.modifiedCount > 0) {
          console.log(`✓ Updated role: ${roleDef.code}`);
          stats.updated++;
        } else {
          console.log(`- Skipped role (no changes): ${roleDef.code}`);
          stats.skipped++;
        }
      }
    } catch (err: any) {
      console.error(`✗ Error seeding role ${roleDef.code}:`, err.message);
      stats.errors++;
      stats.errorDetails?.push({
        record: roleDef,
        error: err.message,
      });
    }
  }

  const duration = Date.now() - startTime;
  console.log('\n' + '-'.repeat(60));
  printStats(stats);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);

  return stats;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateDestructiveOps(options);

  const startTime = Date.now();
  let stats: SeedStats;
  let success = true;
  let error: string | undefined;

  try {
    await connectToDatabase();
    stats = await seedRoles(options);
  } catch (err: any) {
    console.error('\n✗ Seeding failed:', err);
    stats = {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [{ record: null, error: err.message }],
    };
    success = false;
    error = err.message;
  } finally {
    await connection.close();
  }

  // Save report
  const report: SeedReport = {
    scriptName: 'seed-roles',
    timestamp: new Date().toISOString(),
    options,
    stats,
    duration: Date.now() - startTime,
    success,
    error,
  };

  if (!options.dryRun) {
    const reportPath = saveReport(report);
    console.log(`\n✓ Report saved to: ${reportPath}`);
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}
