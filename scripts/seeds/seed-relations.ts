#!/usr/bin/env ts-node

/**
 * Seed relationships between users, roles, and organizations
 *
 * Creates/updates relationships including:
 * - Organization admins (ORG_ADMIN role + OrganizationMember with admin role)
 * - Organization members (OrganizationMember entries for all org users)
 * - Warehouse managers (WAREHOUSE_MANAGER role for orgs with warehouses)
 * - Special roles (INVENTORY_VIEWER, REPORT_VIEWER - 10-20% of users)
 *
 * ⚠️ IMPORTANT:
 * - This script is idempotent - safe to run multiple times
 * - Checks existing roleAssignments and OrganizationMember entries
 * - Uses $addToSet and upsert to avoid duplicates
 * - Requires existing users, roles, and organizations
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/seeds/seed-relations.ts [options]
 *
 * Options:
 *   --batch-size <n>    Number of operations per batch (default: 100)
 *   --drop              Drop existing OrganizationMember before seeding (requires --confirm)
 *   --confirm           Confirm destructive operations
 *   --dry-run           Validate without writing to database
 *   --skip-if-exists    Skip relationships that already exist
 */

import 'tsconfig-paths/register';
import { connect, connection, Model, Types } from 'mongoose';
import { UserSchema, User, RoleAssignment } from '@shared/schemas/user.schema';
import { Role, RoleSchema } from '@shared/schemas/role.schema';
import {
  OrganizationSchema,
  Organization,
} from '@shared/schemas/organization.schema';
import {
  OrganizationMemberSchema,
  OrganizationMember,
  MemberRole,
  MemberStatus,
} from '@shared/schemas/organization-member.schema';
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

// Constants
const ADMIN_SELECTION_RATIO = 0.15; // 15% of org users become admins (1-2 users minimum)
const MIN_ADMINS_PER_ORG = 1;
const MAX_ADMINS_PER_ORG = 2;
const SPECIAL_ROLE_PROBABILITY = 0.15; // 15% of users get special roles (10-20% range)

interface RelationshipStats extends SeedStats {
  orgAdmins?: number;
  orgMembers?: number;
  warehouseManagers?: number;
  specialRoles?: number;
}

interface RoleMap {
  [code: string]: Types.ObjectId;
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
 * Check if user already has a specific role
 */
function hasRole(user: User, roleId: Types.ObjectId): boolean {
  return (
    user.roleAssignments?.some(
      (ra) => ra.roleId.toString() === roleId.toString(),
    ) || false
  );
}

/**
 * Select admin users from organization members
 */
function selectAdmins(users: User[], orgId: Types.ObjectId): User[] {
  if (users.length === 0) return [];

  // Calculate number of admins (15% but at least 1, max 2)
  const numAdmins = Math.max(
    MIN_ADMINS_PER_ORG,
    Math.min(
      MAX_ADMINS_PER_ORG,
      Math.ceil(users.length * ADMIN_SELECTION_RATIO),
    ),
  );

  // Shuffle and select
  const shuffled = [...users].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numAdmins);
}

/**
 * Check if organization has warehouses
 */
async function organizationHasWarehouses(
  orgId: Types.ObjectId,
): Promise<boolean> {
  try {
    const db = connection.db;
    if (!db) return false;
    const warehousesCollection = db.collection('warehouses');
    const count = await warehousesCollection.countDocuments({
      organizationId: orgId,
    });
    return count > 0;
  } catch (err) {
    // If warehouses collection doesn't exist, return false
    return false;
  }
}

/**
 * Seed relationships between users, roles, and organizations
 */
export async function seedRelations(
  options: SeedOptions = {},
): Promise<RelationshipStats> {
  const startTime = Date.now();
  const batchSize = options.batchSize || 100;

  const stats: RelationshipStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
    orgAdmins: 0,
    orgMembers: 0,
    warehouseManagers: 0,
    specialRoles: 0,
  };

  console.log('\n' + '='.repeat(60));
  console.log('SEEDING RELATIONSHIPS');
  console.log('='.repeat(60));
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const UserModel: Model<User> = connection.model('User', UserSchema);
  const RoleModel: Model<Role> = connection.model('Role', RoleSchema);
  const OrganizationModel: Model<Organization> = connection.model(
    'Organization',
    OrganizationSchema,
  );
  const OrganizationMemberModel: Model<OrganizationMember> = connection.model(
    'OrganizationMember',
    OrganizationMemberSchema,
  );

  // Load all roles
  console.log('Loading roles...');
  const roles = await RoleModel.find({}).select('_id code').exec();
  const roleMap: RoleMap = {};
  roles.forEach((role) => {
    roleMap[role.code] = role._id;
  });

  const requiredRoles = [
    'ORG_ADMIN',
    'ORG_USER',
    'WAREHOUSE_MANAGER',
    'INVENTORY_VIEWER',
    'REPORT_VIEWER',
  ];
  const missingRoles = requiredRoles.filter((code) => !roleMap[code]);

  if (missingRoles.length > 0) {
    throw new Error(
      `Required roles not found: ${missingRoles.join(', ')}. Please run seed-roles.ts first.`,
    );
  }

  console.log(`✓ Loaded ${roles.length} roles`);
  console.log(`  - ORG_ADMIN: ${roleMap['ORG_ADMIN']}`);
  console.log(`  - ORG_USER: ${roleMap['ORG_USER']}`);
  console.log(`  - WAREHOUSE_MANAGER: ${roleMap['WAREHOUSE_MANAGER']}`);
  console.log(`  - INVENTORY_VIEWER: ${roleMap['INVENTORY_VIEWER']}`);
  console.log(`  - REPORT_VIEWER: ${roleMap['REPORT_VIEWER']}`);

  // Load all organizations
  console.log('\nLoading organizations...');
  const organizations = await OrganizationModel.find({ status: 'active' })
    .select('_id name')
    .exec();
  console.log(`✓ Loaded ${organizations.length} active organizations`);

  if (organizations.length === 0) {
    console.log(
      'No organizations found. Please run seed-organizations.ts first.',
    );
    return stats;
  }

  // Load all non-SuperAdmin users
  console.log('\nLoading users...');
  const allUsers = await UserModel.find({
    status: { $in: ['active', 'pending'] },
    organizationId: { $exists: true, $ne: null },
  })
    .select('_id username email organizationId roleAssignments')
    .exec();
  console.log(
    `✓ Loaded ${allUsers.length} users with organization assignments`,
  );

  if (allUsers.length === 0) {
    console.log(
      'No users found with organization assignments. Please run seed-users.ts first.',
    );
    return stats;
  }

  // Drop existing OrganizationMember if requested
  if (options.drop && !options.dryRun) {
    console.log('\nDropping existing OrganizationMember entries...');
    await OrganizationMemberModel.deleteMany({});
    console.log('✓ Existing OrganizationMember entries dropped');
  }

  // Get system user for createdBy (use first admin or create placeholder)
  let systemUserId: Types.ObjectId;
  const firstAdmin = allUsers.find((u) =>
    u.roleAssignments?.some(
      (ra) => ra.roleId.toString() === roleMap['ORG_ADMIN'].toString(),
    ),
  );

  if (firstAdmin) {
    systemUserId = firstAdmin._id;
  } else {
    // Use first user as system user
    systemUserId = allUsers[0]._id;
  }

  console.log(`\n✓ Using system user ID: ${systemUserId}`);

  // Process each organization
  console.log('\n' + '-'.repeat(60));
  console.log('Processing organizations...');
  const orgProgress = new ProgressLogger(organizations.length);

  const userUpdateOps: any[] = [];
  const memberUpsertOps: any[] = [];

  for (const org of organizations) {
    try {
      // Get users for this organization
      const orgUsers = allUsers.filter(
        (u) => u.organizationId?.toString() === org._id.toString(),
      );

      if (orgUsers.length === 0) {
        orgProgress.increment();
        continue;
      }

      stats.total += orgUsers.length;

      // 1. Select and assign ORG_ADMIN role
      const adminUsers = selectAdmins(orgUsers, org._id);

      for (const admin of adminUsers) {
        // Check if user already has ORG_ADMIN role
        if (hasRole(admin, roleMap['ORG_ADMIN'])) {
          if (options.skipIfExists) {
            stats.skipped++;
            continue;
          }
        }

        // Add ORG_ADMIN role to user
        userUpdateOps.push({
          updateOne: {
            filter: { _id: admin._id },
            update: {
              $addToSet: {
                roleAssignments: {
                  roleId: roleMap['ORG_ADMIN'],
                  grantedAt: new Date(),
                  grantedBy: systemUserId,
                },
              },
            },
          },
        });

        // Create/update OrganizationMember with admin role
        memberUpsertOps.push({
          updateOne: {
            filter: {
              organizationId: org._id,
              userId: admin._id,
            },
            update: {
              $set: {
                status: MemberStatus.ACTIVE,
                joinedAt: new Date(),
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
              $addToSet: {
                roles: MemberRole.ADMIN,
              },
            },
            upsert: true,
          },
        });

        if (stats.orgAdmins !== undefined) {
          stats.orgAdmins++;
        }
      }

      // 2. Create OrganizationMember entries for all org users
      for (const user of orgUsers) {
        const isAdmin = adminUsers.some(
          (a) => a._id.toString() === user._id.toString(),
        );
        const memberRoles = isAdmin
          ? [MemberRole.ADMIN, MemberRole.MEMBER]
          : [MemberRole.MEMBER];

        memberUpsertOps.push({
          updateOne: {
            filter: {
              organizationId: org._id,
              userId: user._id,
            },
            update: {
              $set: {
                status: MemberStatus.ACTIVE,
                joinedAt: new Date(),
                createdBy: systemUserId,
                updatedBy: systemUserId,
              },
              $addToSet: {
                roles: { $each: memberRoles },
              },
            },
            upsert: true,
          },
        });

        if (stats.orgMembers !== undefined) {
          stats.orgMembers++;
        }
      }

      // 3. Assign WAREHOUSE_MANAGER role if organization has warehouses
      const hasWarehouses = await organizationHasWarehouses(org._id);

      if (hasWarehouses && orgUsers.length > 0) {
        // Select 1-2 users as warehouse managers (prefer non-admins)
        const nonAdmins = orgUsers.filter(
          (u) => !adminUsers.some((a) => a._id.toString() === u._id.toString()),
        );
        const managersPool = nonAdmins.length > 0 ? nonAdmins : orgUsers;
        const numManagers = Math.min(
          2,
          Math.max(1, Math.ceil(managersPool.length * 0.1)),
        );
        const managerUsers = managersPool
          .sort(() => Math.random() - 0.5)
          .slice(0, numManagers);

        for (const manager of managerUsers) {
          // Check if user already has WAREHOUSE_MANAGER role
          if (hasRole(manager, roleMap['WAREHOUSE_MANAGER'])) {
            if (options.skipIfExists) {
              stats.skipped++;
              continue;
            }
          }

          // Add WAREHOUSE_MANAGER role to user
          userUpdateOps.push({
            updateOne: {
              filter: { _id: manager._id },
              update: {
                $addToSet: {
                  roleAssignments: {
                    roleId: roleMap['WAREHOUSE_MANAGER'],
                    grantedAt: new Date(),
                    grantedBy: systemUserId,
                  },
                },
              },
            },
          });

          if (stats.warehouseManagers !== undefined) {
            stats.warehouseManagers++;
          }
        }
      }

      // 4. Randomly assign special roles (INVENTORY_VIEWER, REPORT_VIEWER)
      for (const user of orgUsers) {
        if (Math.random() < SPECIAL_ROLE_PROBABILITY) {
          // Randomly choose one or both special roles
          const specialRoles: Types.ObjectId[] = [];
          if (Math.random() < 0.5) {
            specialRoles.push(roleMap['INVENTORY_VIEWER']);
          }
          if (Math.random() < 0.5) {
            specialRoles.push(roleMap['REPORT_VIEWER']);
          }

          if (specialRoles.length > 0) {
            for (const specialRoleId of specialRoles) {
              // Check if user already has this role
              if (hasRole(user, specialRoleId)) {
                if (options.skipIfExists) {
                  stats.skipped++;
                  continue;
                }
              }

              userUpdateOps.push({
                updateOne: {
                  filter: { _id: user._id },
                  update: {
                    $addToSet: {
                      roleAssignments: {
                        roleId: specialRoleId,
                        grantedAt: new Date(),
                        grantedBy: systemUserId,
                      },
                    },
                  },
                },
              });

              if (stats.specialRoles !== undefined) {
                stats.specialRoles++;
              }
            }
          }
        }
      }

      orgProgress.increment();
    } catch (err: any) {
      console.error(
        `✗ Error processing organization ${org.name}:`,
        err.message,
      );
      stats.errors++;
      stats.errorDetails?.push({
        record: { organizationId: org._id, organizationName: org.name },
        error: err.message,
      });
      orgProgress.increment();
    }
  }

  orgProgress.finish();

  // Execute user updates in batches
  if (!options.dryRun && userUpdateOps.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(`Updating user role assignments in batches of ${batchSize}...`);
    const batches = createBatches(userUpdateOps, batchSize);
    const batchProgress = new ProgressLogger(batches.length);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const result = await UserModel.bulkWrite(batch, { ordered: false });
        stats.updated += result.modifiedCount || 0;
        batchProgress.increment();
      } catch (err: any) {
        if (err.writeErrors) {
          stats.errors += err.writeErrors.length;
          stats.updated += batch.length - err.writeErrors.length;

          err.writeErrors.slice(0, 3).forEach((writeErr: any) => {
            console.error(
              `  ✗ Error in user batch ${batchIndex + 1}:`,
              writeErr.errmsg,
            );
            stats.errorDetails?.push({
              record: { batch: `user-${batchIndex + 1}` },
              error: writeErr.errmsg,
            });
          });
        } else {
          console.error(
            `✗ Error processing user batch ${batchIndex + 1}:`,
            err.message,
          );
          stats.errors += batch.length;
          stats.errorDetails?.push({
            record: { batch: `user-${batchIndex + 1}` },
            error: err.message,
          });
        }
        batchProgress.increment();
      }
    }

    batchProgress.finish();
  } else if (options.dryRun && userUpdateOps.length > 0) {
    console.log(
      `\n[DRY RUN] Would update ${userUpdateOps.length} user role assignments`,
    );
  }

  // Execute OrganizationMember upserts in batches
  if (!options.dryRun && memberUpsertOps.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(
      `Upserting OrganizationMember entries in batches of ${batchSize}...`,
    );
    const batches = createBatches(memberUpsertOps, batchSize);
    const batchProgress = new ProgressLogger(batches.length);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const result = await OrganizationMemberModel.bulkWrite(batch, {
          ordered: false,
        });
        stats.inserted += result.upsertedCount || 0;
        stats.updated += result.modifiedCount || 0;
        batchProgress.increment();
      } catch (err: any) {
        if (err.writeErrors) {
          stats.errors += err.writeErrors.length;
          stats.inserted += batch.length - err.writeErrors.length;

          err.writeErrors.slice(0, 3).forEach((writeErr: any) => {
            console.error(
              `  ✗ Error in member batch ${batchIndex + 1}:`,
              writeErr.errmsg,
            );
            stats.errorDetails?.push({
              record: { batch: `member-${batchIndex + 1}` },
              error: writeErr.errmsg,
            });
          });
        } else {
          console.error(
            `✗ Error processing member batch ${batchIndex + 1}:`,
            err.message,
          );
          stats.errors += batch.length;
          stats.errorDetails?.push({
            record: { batch: `member-${batchIndex + 1}` },
            error: err.message,
          });
        }
        batchProgress.increment();
      }
    }

    batchProgress.finish();
  } else if (options.dryRun && memberUpsertOps.length > 0) {
    console.log(
      `\n[DRY RUN] Would upsert ${memberUpsertOps.length} OrganizationMember entries`,
    );
  }

  const duration = Date.now() - startTime;
  console.log('\n' + '-'.repeat(60));
  console.log('\nRelationship Statistics:');
  console.log(`  Organization Admins: ${stats.orgAdmins}`);
  console.log(`  Organization Members: ${stats.orgMembers}`);
  console.log(`  Warehouse Managers: ${stats.warehouseManagers}`);
  console.log(`  Special Roles Assigned: ${stats.specialRoles}`);
  console.log('');
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
  let stats: RelationshipStats;
  let success = true;
  let error: string | undefined;

  try {
    await connectToDatabase();
    stats = await seedRelations(options);
  } catch (err: any) {
    console.error('\n✗ Seeding failed:', err);
    stats = {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [{ record: null, error: err.message }],
      orgAdmins: 0,
      orgMembers: 0,
      warehouseManagers: 0,
      specialRoles: 0,
    };
    success = false;
    error = err.message;
  } finally {
    await connection.close();
  }

  // Save report
  const report: SeedReport = {
    scriptName: 'seed-relations',
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
