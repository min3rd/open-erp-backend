const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();

/**
 * Seed script for creating a SYSTEM_ADMIN user from environment variables
 *
 * Usage:
 *   SYSTEM_ADMIN_EMAIL=admin@example.com \
 *   SYSTEM_ADMIN_PASSWORD=securepassword \
 *   SYSTEM_ADMIN_NAME="System Administrator" \
 *   npm run seed:system-admin
 */

const ADMIN_EMAIL = process.env.SYSTEM_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SYSTEM_ADMIN_NAME || 'System Administrator';

async function seedSystemAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Error: SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD environment variables are required',
    );
    console.error('\nUsage:');
    console.error('  SYSTEM_ADMIN_EMAIL=admin@example.com \\');
    console.error('  SYSTEM_ADMIN_PASSWORD=securepassword \\');
    console.error('  SYSTEM_ADMIN_NAME="System Administrator" \\');
    console.error('  npm run seed:system-admin');
    process.exit(1);
  }

  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'open_erp';
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASS;
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

  // Build connection string with credentials
  if (user && pass) {
    const match = uri.match(/mongodb:\/\/(.+)/);
    if (match) {
      const hostPort = match[1];
      uri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hostPort}/?authSource=${authSource}`;
    }
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  const client = new MongoClient(uri, options);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const rolesCollection = db.collection('roles');
    const usersCollection = db.collection('users');

    // 1. Ensure SYSTEM_ADMIN role exists
    console.log('\n1. Checking for SYSTEM_ADMIN role...');
    let systemAdminRole = await rolesCollection.findOne({
      code: 'SYSTEM_ADMIN',
      scope: 'global',
    });

    if (!systemAdminRole) {
      console.log('Creating SYSTEM_ADMIN role...');
      const roleInsertResult = await rolesCollection.insertOne({
        name: 'System Administrator',
        code: 'SYSTEM_ADMIN',
        description: 'Full system administrator with unrestricted access',
        scope: 'global',
        organizationId: null,
        permissions: [
          'system.admin',
          'system.config',
          'system.logs',
          'user.create',
          'user.read',
          'user.update',
          'user.delete',
          'user.manage',
          'role.create',
          'role.read',
          'role.update',
          'role.delete',
          'role.manage',
          'role.assign',
        ],
        status: 'active',
        isSystem: true,
        metadata: {},
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      systemAdminRole = await rolesCollection.findOne({
        _id: roleInsertResult.insertedId,
      });
      console.log(
        `✓ SYSTEM_ADMIN role created with ID: ${systemAdminRole._id}`,
      );
    } else {
      console.log(
        `✓ SYSTEM_ADMIN role already exists with ID: ${systemAdminRole._id}`,
      );
    }

    // 2. Check if user already exists
    console.log(`\n2. Checking for user with email: ${ADMIN_EMAIL}...`);
    let user = await usersCollection.findOne({ email: ADMIN_EMAIL });

    if (!user) {
      console.log('Creating new user...');
      // Hash password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      const userInsertResult = await usersCollection.insertOne({
        username: ADMIN_EMAIL,
        email: ADMIN_EMAIL,
        fullName: ADMIN_NAME,
        password: hashedPassword,
        status: 'active',
        verifiedAt: new Date(),
        roleAssignments: [
          {
            roleId: systemAdminRole._id,
            grantedAt: new Date(),
            grantedBy: null, // system-seeded
          },
        ],
        specialPermissions: [],
        organizationId: null,
        deletedAt: null,
        lastLoginAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      user = await usersCollection.findOne({
        _id: userInsertResult.insertedId,
      });
      console.log(`✓ User created with ID: ${user._id}`);
      console.log(`✓ SYSTEM_ADMIN role assigned to user`);
    } else {
      console.log(`✓ User already exists with ID: ${user._id}`);

      // Check if user already has SYSTEM_ADMIN role
      const hasSystemAdmin = user.roleAssignments?.some(
        (ra) => ra.roleId.toString() === systemAdminRole._id.toString(),
      );

      if (!hasSystemAdmin) {
        console.log('Adding SYSTEM_ADMIN role to existing user...');
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $addToSet: {
              roleAssignments: {
                roleId: systemAdminRole._id,
                grantedAt: new Date(),
                grantedBy: null, // system-seeded
              },
            },
            $set: {
              updatedAt: new Date(),
            },
          },
        );
        console.log(`✓ SYSTEM_ADMIN role assigned to existing user`);
      } else {
        console.log('✓ User already has SYSTEM_ADMIN role');
      }

      // Update password if needed
      if (ADMIN_PASSWORD) {
        console.log('Updating user password...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedPassword,
              updatedAt: new Date(),
            },
          },
        );
        console.log('✓ Password updated');
      }
    }

    // 3. Summary
    console.log('\n--- Seed Summary ---');
    console.log(`SYSTEM_ADMIN role ID: ${systemAdminRole._id}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Name: ${ADMIN_NAME}`);
    console.log('\n✓ SYSTEM_ADMIN user seeded successfully!');
    console.log('\nYou can now log in with:');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: [your provided password]`);
  } catch (error) {
    console.error('Error seeding SYSTEM_ADMIN user:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedSystemAdmin()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
