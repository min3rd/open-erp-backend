#!/usr/bin/env ts-node

/**
 * Seed users with realistic data
 * 
 * Creates/upserts users including:
 * - 1 SuperAdmin user with global privileges
 * - N regular users with faker-generated data and role assignments
 * 
 * ⚠️ SECURITY WARNING:
 * - Regular users use a common password "Password123" (hardcoded for dev/test)
 * - This is INTENTIONAL for development/testing environments
 * - DO NOT use this script in production without modifying password logic
 * - SuperAdmin password should always be set via --seed-superadmin-password in production
 * 
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/seeds/seed-users.ts [options]
 * 
 * Options:
 *   --count <n>                     Number of regular users to create (default: 10000)
 *   --batch-size <n>                Number of users to process per batch (default: 500)
 *   --drop                          Drop existing users before seeding (requires --confirm)
 *   --confirm                       Confirm destructive operations
 *   --dry-run                       Validate without writing to database
 *   --seed-superadmin-password <p>  Password for SuperAdmin (generates strong random if not provided)
 *   --domain <domain>               Email domain for users (default: example.com)
 *   --skip-if-exists                Skip users that already exist by email
 */

import 'tsconfig-paths/register';
import { connect, connection, Model, Schema as MongooseSchema, Types } from 'mongoose';
import { faker } from '@faker-js/faker';
import { UserSchema, User, RoleAssignment } from '@shared/schemas/user.schema';
import { Role, RoleSchema } from '@shared/schemas/role.schema';
import { OrganizationSchema, Organization } from '@shared/schemas/organization.schema';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import * as bcrypt from 'bcrypt';
import {
  parseArgs,
  validateDestructiveOps,
  printStats,
  saveReport,
  createBatches,
  generateStrongPassword,
  SeedOptions,
  SeedStats,
  SeedReport,
  ProgressLogger,
} from './utils/seed-utils';

require('dotenv').config();

interface UserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  phone?: string;
  status: string;
  verifiedAt?: Date;
  organizationId?: any;
  roleAssignments: any[];
  specialPermissions: string[];
}

// Track generated emails to ensure uniqueness
const generatedEmails = new Set<string>();
const generatedUsernames = new Set<string>();

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
    console.warn('Initial connection failed, retrying with embedded credentials...');
    const authPart = dbConfig.user && dbConfig.pass
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
 * Generate a unique email with domain override
 */
function generateUniqueEmail(domain: string, maxAttempts: number = 100): string {
  for (let i = 0; i < maxAttempts; i++) {
    const username = faker.internet.username().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `${username}${randomSuffix}@${domain}`;
    
    if (!generatedEmails.has(email)) {
      generatedEmails.add(email);
      return email;
    }
  }
  
  // Fallback with timestamp
  const timestamp = Date.now();
  const email = `user${timestamp}@${domain}`;
  generatedEmails.add(email);
  return email;
}

/**
 * Generate a unique username
 */
function generateUniqueUsername(maxAttempts: number = 100): string {
  for (let i = 0; i < maxAttempts; i++) {
    const baseUsername = faker.internet.username().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const suffix = Math.floor(Math.random() * 100000);
    const username = `${baseUsername}${suffix}`;
    
    if (!generatedUsernames.has(username) && username.length >= 3) {
      generatedUsernames.add(username);
      return username;
    }
  }
  
  // Fallback with timestamp
  const timestamp = Date.now();
  const username = `user${timestamp}`;
  generatedUsernames.add(username);
  return username;
}

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Generate SuperAdmin user data
 */
async function generateSuperAdminUser(
  domain: string,
  superAdminRoleId: any,
  providedPassword?: string
): Promise<{ user: UserData; plainPassword: string }> {
  const plainPassword = providedPassword || generateStrongPassword(16);
  const hashedPassword = await hashPassword(plainPassword);

  const email = `superadmin@${domain}`;
  generatedEmails.add(email);
  generatedUsernames.add('superadmin');

  const user: UserData = {
    username: 'superadmin',
    email,
    password: hashedPassword,
    displayName: 'Super Administrator',
    fullName: 'Super Administrator',
    firstName: 'Super',
    lastName: 'Administrator',
    status: 'active',
    verifiedAt: new Date(),
    roleAssignments: [
      {
        roleId: superAdminRoleId,
        grantedAt: new Date(),
      },
    ],
    specialPermissions: [],
  };

  return { user, plainPassword };
}

/**
 * Generate regular user data
 */
async function generateRegularUser(
  index: number,
  domain: string,
  orgUserRoleId: any,
  organizationIds: any[],
  commonPassword: string
): Promise<UserData> {
  const hashedPassword = await hashPassword(commonPassword);

  // Status distribution: 90% active, 5% pending, 5% inactive
  let status: string;
  const statusRand = Math.random();
  if (statusRand < 0.90) {
    status = 'active';
  } else if (statusRand < 0.95) {
    status = 'pending';
  } else {
    status = 'inactive';
  }

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fullName = `${firstName} ${lastName}`;

  // 70% of users have phone numbers (realistic distribution - not all users provide phone)
  const phone = Math.random() < 0.7 ? faker.phone.number() : undefined;

  // Randomly assign to an organization (if any exist)
  const organizationId = organizationIds.length > 0
    ? faker.helpers.arrayElement(organizationIds)
    : undefined;

  const user: UserData = {
    username: generateUniqueUsername(),
    email: generateUniqueEmail(domain),
    password: hashedPassword,
    firstName,
    lastName,
    fullName,
    displayName: fullName,
    phone,
    status,
    verifiedAt: status === 'active' ? new Date() : undefined,
    organizationId,
    roleAssignments: [
      {
        roleId: orgUserRoleId,
        grantedAt: new Date(),
      },
    ],
    specialPermissions: [],
  };

  return user;
}

/**
 * Seed users
 */
export async function seedUsers(options: SeedOptions = {}): Promise<SeedStats> {
  const startTime = Date.now();
  const count = options.count || 10000;
  const batchSize = options.batchSize || 500;
  const domain = options.domain || 'example.com';
  const commonPassword = 'Password123'; // Common password for regular users (dev/test purposes)

  const stats: SeedStats = {
    total: count + 1, // +1 for SuperAdmin
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log('\n' + '='.repeat(60));
  console.log('SEEDING USERS');
  console.log('='.repeat(60));
  console.log(`Total users to seed: ${stats.total} (1 SuperAdmin + ${count} regular users)`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Domain: ${domain}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const UserModel: Model<User> = connection.model('User', UserSchema);
  const RoleModel: Model<Role> = connection.model('Role', RoleSchema);
  const OrganizationModel: Model<Organization> = connection.model('Organization', OrganizationSchema);

  // Get required roles
  console.log('Fetching roles...');
  const superAdminRole = await RoleModel.findOne({ code: 'SUPER_ADMIN' }).exec();
  const orgUserRole = await RoleModel.findOne({ code: 'ORG_USER' }).exec();

  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN role not found. Please run seed-roles.ts first.');
  }
  if (!orgUserRole) {
    throw new Error('ORG_USER role not found. Please run seed-roles.ts first.');
  }

  console.log(`✓ Found SUPER_ADMIN role: ${superAdminRole._id}`);
  console.log(`✓ Found ORG_USER role: ${orgUserRole._id}`);

  // Get all organizations for random assignment
  console.log('Fetching organizations...');
  const organizations = await OrganizationModel.find({ status: 'active' })
    .select('_id')
    .limit(1000)
    .exec();
  const organizationIds = organizations.map(org => org._id);
  console.log(`✓ Found ${organizationIds.length} organizations`);

  // Drop existing users if requested
  if (options.drop && !options.dryRun) {
    console.log('Dropping existing users...');
    await UserModel.deleteMany({});
    console.log('✓ Existing users dropped');
  }

  // Generate and seed SuperAdmin user
  console.log('\n' + '-'.repeat(60));
  console.log('Creating SuperAdmin user...');
  const { user: superAdminData, plainPassword } = await generateSuperAdminUser(
    domain,
    superAdminRole._id,
    options.seedSuperadminPassword
  );

  if (options.dryRun) {
    console.log(`[DRY RUN] Would create SuperAdmin: ${superAdminData.email}`);
    stats.inserted++;
  } else {
    try {
      // Check if SuperAdmin already exists
      const existingSuperAdmin = await UserModel.findOne({ email: superAdminData.email }).exec();
      
      if (existingSuperAdmin && options.skipIfExists) {
        console.log(`- Skipped SuperAdmin (already exists): ${superAdminData.email}`);
        stats.skipped++;
      } else if (existingSuperAdmin) {
        // Update existing
        await UserModel.updateOne(
          { email: superAdminData.email },
          { $set: superAdminData }
        ).exec();
        console.log(`✓ Updated SuperAdmin: ${superAdminData.email}`);
        stats.updated++;
      } else {
        // Insert new
        await UserModel.create(superAdminData);
        console.log(`✓ Created SuperAdmin: ${superAdminData.email}`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('SuperAdmin credentials:');
        console.log(`  Email:    ${superAdminData.email}`);
        console.log(`  Password: ${plainPassword}`);
        console.log('═'.repeat(60));
        console.log('');
        stats.inserted++;
      }
    } catch (err: any) {
      console.error(`✗ Error creating SuperAdmin:`, err.message);
      stats.errors++;
      stats.errorDetails?.push({
        record: superAdminData,
        error: err.message,
      });
    }
  }

  // Generate regular users
  console.log('-'.repeat(60));
  console.log(`Generating ${count} regular users...`);
  const regularUsers: UserData[] = [];
  const progress = new ProgressLogger(count);

  for (let i = 0; i < count; i++) {
    try {
      const user = await generateRegularUser(
        i,
        domain,
        orgUserRole._id,
        organizationIds,
        commonPassword
      );
      regularUsers.push(user);
      progress.increment();
    } catch (err: any) {
      console.error(`✗ Error generating user ${i}:`, err.message);
      stats.errors++;
      stats.errorDetails?.push({
        record: { index: i },
        error: err.message,
      });
    }
  }

  progress.finish();
  console.log(`✓ Generated ${regularUsers.length} users`);

  // Process users in batches
  if (!options.dryRun && regularUsers.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(`Inserting users in batches of ${batchSize}...`);
    const batches = createBatches(regularUsers, batchSize);
    const batchProgress = new ProgressLogger(batches.length);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        if (options.skipIfExists) {
          // Check which users already exist
          const existingEmails = await UserModel.find({
            email: { $in: batch.map(u => u.email) }
          })
            .select('email')
            .exec();
          
          const existingEmailSet = new Set(existingEmails.map(u => u.email));
          const newUsers = batch.filter(u => !existingEmailSet.has(u.email));
          
          if (newUsers.length > 0) {
            const result = await UserModel.insertMany(newUsers, { ordered: false });
            stats.inserted += result.length;
          }
          
          stats.skipped += batch.length - newUsers.length;
        } else {
          // Use bulkWrite for upsert behavior
          const bulkOps = batch.map(user => ({
            updateOne: {
              filter: { email: user.email },
              update: { $set: user as any },
              upsert: true,
            },
          }));

          const result = await UserModel.bulkWrite(bulkOps, { ordered: false });
          stats.inserted += result.upsertedCount || 0;
          stats.updated += result.modifiedCount || 0;
          stats.skipped += batch.length - (result.upsertedCount || 0) - (result.modifiedCount || 0);
        }

        batchProgress.increment();
      } catch (err: any) {
        // Handle bulk write errors (some may succeed)
        if (err.writeErrors) {
          stats.errors += err.writeErrors.length;
          stats.inserted += batch.length - err.writeErrors.length;
          
          // Log first few errors
          err.writeErrors.slice(0, 3).forEach((writeErr: any) => {
            console.error(`  ✗ Error in batch ${batchIndex + 1}:`, writeErr.errmsg);
            stats.errorDetails?.push({
              record: { batch: batchIndex + 1 },
              error: writeErr.errmsg,
            });
          });
        } else {
          console.error(`✗ Error processing batch ${batchIndex + 1}:`, err.message);
          stats.errors += batch.length;
          stats.errorDetails?.push({
            record: { batch: batchIndex + 1 },
            error: err.message,
          });
        }
        batchProgress.increment();
      }
    }

    batchProgress.finish();
  } else if (options.dryRun) {
    console.log(`[DRY RUN] Would insert ${regularUsers.length} regular users`);
    stats.inserted += regularUsers.length;
  }

  const duration = Date.now() - startTime;
  console.log('\n' + '-'.repeat(60));
  printStats(stats);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`Throughput: ${(stats.total / (duration / 1000)).toFixed(0)} users/second`);

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
    stats = await seedUsers(options);
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
    scriptName: 'seed-users',
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
