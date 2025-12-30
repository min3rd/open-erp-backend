const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

/**
 * Seed script for default roles and permissions
 * Creates system-level global roles and sample tenant roles
 */

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'open_erp';

// Define default global roles
const GLOBAL_ROLES = [
  {
    name: 'System Administrator',
    code: 'SYSTEM_ADMIN',
    description: 'Full system access across all tenants',
    scope: 'global',
    tenantId: null,
    permissions: [
      'system.admin',
      'system.config',
      'system.logs',
      'tenant.create',
      'tenant.read',
      'tenant.update',
      'tenant.delete',
      'tenant.manage',
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
      'department.create',
      'department.read',
      'department.update',
      'department.delete',
      'department.manage',
    ],
    status: 'active',
    isSystem: true,
  },
  {
    name: 'Support Staff',
    code: 'SUPPORT_STAFF',
    description: 'Read-only access to assist customers across tenants',
    scope: 'global',
    tenantId: null,
    permissions: [
      'user.read',
      'tenant.read',
      'department.read',
      'order.read',
      'product.read',
      'report.view',
    ],
    status: 'active',
    isSystem: true,
  },
];

// Function to create tenant-scoped roles
function createTenantRoles(tenantId) {
  return [
    {
      name: 'Tenant Admin',
      code: 'TENANT_ADMIN',
      description: 'Full administrative access within the tenant',
      scope: 'tenant',
      tenantId: tenantId,
      permissions: [
        'user.create',
        'user.read',
        'user.update',
        'user.delete',
        'user.manage',
        'role.create',
        'role.read',
        'role.update',
        'role.delete',
        'role.assign',
        'department.create',
        'department.read',
        'department.update',
        'department.delete',
        'department.manage',
        'order.create',
        'order.read',
        'order.update',
        'order.delete',
        'order.approve',
        'order.manage',
        'product.create',
        'product.read',
        'product.update',
        'product.delete',
        'product.manage',
        'report.view',
        'report.export',
        'report.manage',
      ],
      status: 'active',
      isSystem: true,
    },
    {
      name: 'Manager',
      code: 'MANAGER',
      description: 'Department manager with approval rights',
      scope: 'tenant',
      tenantId: tenantId,
      permissions: [
        'user.read',
        'department.read',
        'order.create',
        'order.read',
        'order.update',
        'order.approve',
        'product.read',
        'product.update',
        'report.view',
        'report.export',
      ],
      status: 'active',
      isSystem: false,
    },
    {
      name: 'Sales Representative',
      code: 'SALES_REP',
      description: 'Sales team member with order and customer management',
      scope: 'tenant',
      tenantId: tenantId,
      permissions: [
        'user.read',
        'order.create',
        'order.read',
        'order.update',
        'product.read',
        'report.view',
      ],
      status: 'active',
      isSystem: false,
    },
    {
      name: 'Employee',
      code: 'EMPLOYEE',
      description: 'Basic employee with read-only access',
      scope: 'tenant',
      tenantId: tenantId,
      permissions: [
        'user.read',
        'department.read',
        'product.read',
        'report.view',
      ],
      status: 'active',
      isSystem: false,
    },
  ];
}

async function seedRoles() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(MONGODB_DB);
    const rolesCollection = db.collection('roles');
    const tenantsCollection = db.collection('tenants');

    // Check if roles already exist
    const existingRolesCount = await rolesCollection.countDocuments();
    if (existingRolesCount > 0) {
      console.log(
        `Found ${existingRolesCount} existing roles. Skipping global roles seeding.`
      );
    } else {
      // Seed global roles
      console.log('Seeding global roles...');
      const globalRolesToInsert = GLOBAL_ROLES.map((role) => ({
        ...role,
        metadata: {},
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const globalResult = await rolesCollection.insertMany(globalRolesToInsert);
      console.log(`Inserted ${globalResult.insertedCount} global roles`);
    }

    // Seed tenant-specific roles for each tenant
    const tenants = await tenantsCollection.find({ deletedAt: null }).toArray();

    if (tenants.length === 0) {
      console.log('No tenants found. Skipping tenant roles seeding.');
    } else {
      for (const tenant of tenants) {
        console.log(`\nSeeding roles for tenant: ${tenant.name} (${tenant._id})`);

        // Check if roles already exist for this tenant
        const existingTenantRoles = await rolesCollection.countDocuments({
          tenantId: tenant._id,
        });

        if (existingTenantRoles > 0) {
          console.log(
            `  Tenant already has ${existingTenantRoles} roles. Skipping.`
          );
          continue;
        }

        const tenantRoles = createTenantRoles(tenant._id);
        const tenantRolesToInsert = tenantRoles.map((role) => ({
          ...role,
          metadata: {},
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const tenantResult = await rolesCollection.insertMany(tenantRolesToInsert);
        console.log(`  Inserted ${tenantResult.insertedCount} tenant roles`);
      }
    }

    // Display summary
    console.log('\n--- Seeding Summary ---');
    const totalRoles = await rolesCollection.countDocuments();
    const globalRolesCount = await rolesCollection.countDocuments({
      scope: 'global',
    });
    const tenantRolesCount = await rolesCollection.countDocuments({
      scope: 'tenant',
    });

    console.log(`Total roles: ${totalRoles}`);
    console.log(`Global roles: ${globalRolesCount}`);
    console.log(`Tenant roles: ${tenantRolesCount}`);
    console.log('\nRoles seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedRoles()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
