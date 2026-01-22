#!/usr/bin/env ts-node

/**
 * Seed organizations with realistic data
 * 
 * Creates/upserts organizations with comprehensive data including:
 * - Company information (name, taxId, type)
 * - Contact details (address, phone, email, website)
 * - Legal information (representative, founded date)
 * - Optional type distribution for HOLDING and BRANCH organizations
 * 
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/seeds/seed-organizations.ts [options]
 * 
 * Options:
 *   --count <n>         Number of organizations to create (default: 500)
 *   --batch-size <n>    Number of orgs to process per batch (default: 100)
 *   --drop              Drop existing organizations before seeding (requires --confirm)
 *   --confirm           Confirm destructive operations
 *   --dry-run           Validate without writing to database
 *   --hierarchy         Create distribution with HOLDING (20%), BRANCH (30%), others (50%)
 *                       Note: Organization schema doesn't have parentId field yet.
 *                       This flag only controls type distribution.
 */

import 'tsconfig-paths/register';
import { connect, connection, Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import {
  OrganizationSchema,
  Organization,
  OrganizationType,
  OrganizationStatus,
} from '@shared/schemas/organization.schema';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import {
  parseArgs,
  validateDestructiveOps,
  printStats,
  saveReport,
  createBatches,
  SeedOptions,
  SeedStats,
  SeedReport,
  ProgressLogger,
} from './utils/seed-utils';

require('dotenv').config();

interface OrganizationData {
  type: OrganizationType;
  name: string;
  internationalName?: string;
  taxId: string;
  headquartersAddress: string;
  legalRepresentative: string;
  contactPhone: string;
  contactEmail: string;
  foundedDate: Date;
  status: OrganizationStatus;
  country: string;
  description?: string;
  website?: string;
  createdBy: string;
}

/**
 * Generate a unique tax ID
 */
function generateTaxId(index: number): string {
  return `ORG${String(index).padStart(10, '0')}`;
}

/**
 * Generate realistic organization data
 */
function generateOrganization(
  index: number,
  systemUserId: string,
  forceType?: OrganizationType
): OrganizationData {
  // Determine organization type
  const type = forceType || faker.helpers.arrayElement(Object.values(OrganizationType));

  // Status distribution: 85% active, 10% inactive, 5% other
  let status: OrganizationStatus;
  const statusRand = Math.random();
  if (statusRand < 0.85) {
    status = OrganizationStatus.ACTIVE;
  } else if (statusRand < 0.95) {
    status = OrganizationStatus.INACTIVE;
  } else if (statusRand < 0.98) {
    status = OrganizationStatus.SUSPENDED;
  } else {
    status = OrganizationStatus.PENDING;
  }

  const companyName = faker.company.name();
  const emailDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company';
  
  return {
    type,
    name: companyName,
    internationalName: Math.random() > 0.5 ? `${companyName} International` : undefined,
    taxId: generateTaxId(index),
    headquartersAddress: faker.location.streetAddress(true),
    legalRepresentative: faker.person.fullName(),
    contactPhone: faker.phone.number(),
    contactEmail: faker.internet.email({ provider: emailDomain + '.com' }),
    foundedDate: faker.date.past({ years: 20 }),
    status,
    country: 'VN',
    description: Math.random() > 0.3 ? faker.company.catchPhrase() : undefined,
    website: Math.random() > 0.4 ? faker.internet.url() : undefined,
    createdBy: systemUserId,
  };
}

/**
 * Generate organizations with optional hierarchy
 */
function generateOrganizations(
  count: number,
  systemUserId: string,
  withHierarchy: boolean
): OrganizationData[] {
  const organizations: OrganizationData[] = [];

  if (withHierarchy) {
    // Create hierarchy distribution: 20% HOLDINGs, 30% BRANCHes, 50% others
    const holdingCount = Math.floor(count * 0.2);
    const branchCount = Math.floor(count * 0.3);
    const otherCount = count - holdingCount - branchCount;

    console.log(`\nGenerating hierarchical organizations:`);
    console.log(`  HOLDINGs: ${holdingCount}`);
    console.log(`  BRANCHes: ${branchCount}`);
    console.log(`  Others: ${otherCount}`);

    let orgIndex = 0;

    // Generate HOLDINGs
    for (let i = 0; i < holdingCount; i++) {
      const org = generateOrganization(orgIndex++, systemUserId, OrganizationType.HOLDING);
      organizations.push(org);
    }

    // Generate BRANCHes
    for (let i = 0; i < branchCount; i++) {
      const org = generateOrganization(orgIndex++, systemUserId, OrganizationType.BRANCH);
      organizations.push(org);
    }

    // Generate other organizations
    for (let i = 0; i < otherCount; i++) {
      const org = generateOrganization(orgIndex++, systemUserId);
      organizations.push(org);
    }
  } else {
    // Generate flat structure
    for (let i = 0; i < count; i++) {
      const org = generateOrganization(i, systemUserId);
      organizations.push(org);
    }
  }

  return organizations;
}

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
 * Get or create system user for createdBy field
 */
async function getSystemUserId(): Promise<string> {
  try {
    const UserModel = connection.model('User');
    const systemUser = await UserModel.findOne({ email: 'system@open-erp.local' });
    
    if (systemUser) {
      console.log('✓ Using existing system user');
      return (systemUser as any)._id.toString();
    }

    console.log('! No system user found, using placeholder ObjectId');
    return '000000000000000000000000';
  } catch (err) {
    console.log('! User model not found, using placeholder ObjectId');
    return '000000000000000000000000';
  }
}

/**
 * Seed organizations
 */
export async function seedOrganizations(options: SeedOptions = {}): Promise<SeedStats> {
  const startTime = Date.now();
  const count = options.count || 500;
  const batchSize = options.batchSize || 100;
  const withHierarchy = options.hierarchy || false;
  
  const stats: SeedStats = {
    total: count,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log('\n' + '='.repeat(60));
  console.log('SEEDING ORGANIZATIONS');
  console.log('='.repeat(60));
  console.log(`Total organizations to seed: ${stats.total}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`With hierarchy: ${withHierarchy ? 'YES' : 'NO'}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const OrganizationModel: Model<Organization> = connection.model('Organization', OrganizationSchema);

  // Drop existing organizations if requested
  if (options.drop && !options.dryRun) {
    console.log('Dropping existing organizations...');
    const deleteResult = await OrganizationModel.deleteMany({});
    console.log(`✓ Dropped ${deleteResult.deletedCount} existing organizations`);
  }

  // Get system user ID
  const systemUserId = await getSystemUserId();

  // Generate organization data
  console.log('\nGenerating organization data...');
  const organizations = generateOrganizations(count, systemUserId, withHierarchy);
  console.log(`✓ Generated ${organizations.length} organizations`);

  if (options.dryRun) {
    console.log('\n[DRY RUN] Would insert the following sample organizations:');
    console.log(JSON.stringify(organizations.slice(0, 3), null, 2));
    stats.inserted = count;
    return stats;
  }

  // Process in batches
  console.log('\nProcessing organizations in batches...');
  const batches = createBatches(organizations, batchSize);
  const progress = new ProgressLogger(count);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      // Prepare bulk operations
      const bulkOps = batch.map(org => ({
        updateOne: {
          filter: { taxId: org.taxId },
          update: {
            $set: {
              type: org.type,
              name: org.name,
              internationalName: org.internationalName,
              headquartersAddress: org.headquartersAddress,
              legalRepresentative: org.legalRepresentative,
              contactPhone: org.contactPhone,
              contactEmail: org.contactEmail,
              foundedDate: org.foundedDate,
              status: org.status,
              country: org.country,
              description: org.description,
              website: org.website,
            },
            $setOnInsert: {
              createdBy: org.createdBy,
            },
          },
          upsert: true,
        },
      }));

      const result = await OrganizationModel.bulkWrite(bulkOps as any);
      
      stats.inserted += result.upsertedCount || 0;
      stats.updated += result.modifiedCount || 0;
      stats.skipped += batch.length - (result.upsertedCount || 0) - (result.modifiedCount || 0);

      progress.increment(batch.length);
    } catch (err: any) {
      console.error(`\n✗ Error processing batch ${batchIndex + 1}:`, err.message);
      stats.errors += batch.length;
      stats.errorDetails?.push({
        record: { batch: batchIndex + 1, size: batch.length },
        error: err.message,
      });
    }
  }

  progress.finish();

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
  
  // Set defaults
  if (!options.count) options.count = 500;
  if (!options.batchSize) options.batchSize = 100;
  
  validateDestructiveOps(options);

  const startTime = Date.now();
  let stats: SeedStats;
  let success = true;
  let error: string | undefined;

  try {
    await connectToDatabase();
    stats = await seedOrganizations(options);
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
    scriptName: 'seed-organizations',
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
