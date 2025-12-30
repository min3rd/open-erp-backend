const { ObjectId } = require('mongodb');

module.exports = {
  /**
   * Migration to add multi-tenant and RBAC fields to users collection
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: Add multi-tenant and RBAC fields to users...');

    // First, check if we need to create a default tenant for existing users
    const existingUsersCount = await db.collection('users').countDocuments();
    let defaultTenantId = null;

    if (existingUsersCount > 0) {
      console.log(`Found ${existingUsersCount} existing users. Creating default tenant...`);

      // Create default tenant for existing users
      const defaultTenant = await db.collection('tenants').insertOne({
        name: 'Default Organization',
        slug: 'default',
        description: 'Default tenant for existing users',
        status: 'active',
        settings: {},
        deletedAt: null,
        trialExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      defaultTenantId = defaultTenant.insertedId;
      console.log(`Created default tenant with ID: ${defaultTenantId}`);
    }

    // Update collection validator to include new fields
    await db.command({
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['username', 'email', 'status', 'tenantId'],
          properties: {
            username: {
              bsonType: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Username must be a string between 3-50 characters',
            },
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'Email must be a valid email address',
            },
            firstName: {
              bsonType: 'string',
              maxLength: 100,
              description: 'First name must be a string with max 100 characters',
            },
            lastName: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Last name must be a string with max 100 characters',
            },
            status: {
              bsonType: 'string',
              enum: ['pending', 'active', 'inactive', 'suspended'],
              description: 'Status must be one of: pending, active, inactive, suspended',
            },
            tenantId: {
              bsonType: 'objectId',
              description: 'Tenant ID is required for multi-tenancy',
            },
            roleAssignments: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['roleId', 'grantedAt'],
                properties: {
                  roleId: {
                    bsonType: 'objectId',
                    description: 'Role ID',
                  },
                  departmentId: {
                    bsonType: ['objectId', 'null'],
                    description: 'Optional department ID',
                  },
                  grantedAt: {
                    bsonType: 'date',
                    description: 'Date when role was granted',
                  },
                  grantedBy: {
                    bsonType: ['objectId', 'null'],
                    description: 'User who granted this role',
                  },
                },
              },
              description: 'Array of role assignments',
            },
            specialPermissions: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                pattern: '^[a-z]+\\.[a-z]+$',
                description: 'Permission must be in format: resource.action',
              },
              description: 'Array of special permissions granted directly to user',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Deletion timestamp for soft delete',
            },
            lastLoginAt: {
              bsonType: ['date', 'null'],
              description: 'Last login timestamp',
            },
            verifiedAt: {
              bsonType: ['date', 'null'],
              description: 'Email verification timestamp',
            },
            createdAt: {
              bsonType: 'date',
              description: 'Creation timestamp',
            },
            updatedAt: {
              bsonType: 'date',
              description: 'Last update timestamp',
            },
          },
        },
      },
    });

    console.log('Updated users collection validator');

    // Update existing users to add new fields if they don't have them
    if (defaultTenantId) {
      await db.collection('users').updateMany(
        { tenantId: { $exists: false } },
        {
          $set: {
            tenantId: defaultTenantId,
            roleAssignments: [],
            specialPermissions: [],
          },
        }
      );

      console.log('Updated existing users with default tenant and empty role assignments');
    }

    // Add new indexes for tenant-based queries
    await db.collection('users').createIndex({ tenantId: 1, status: 1 });
    await db.collection('users').createIndex({ tenantId: 1, email: 1 });
    await db.collection('users').createIndex({ tenantId: 1, username: 1 });

    console.log('Added tenant-based indexes to users collection');
    console.log('Migration completed successfully!');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Rolling back: Remove multi-tenant and RBAC fields from users...');

    // Remove the new indexes
    await db.collection('users').dropIndex('tenantId_1_status_1');
    await db.collection('users').dropIndex('tenantId_1_email_1');
    await db.collection('users').dropIndex('tenantId_1_username_1');

    // Remove fields from all users
    await db.collection('users').updateMany(
      {},
      {
        $unset: {
          tenantId: '',
          roleAssignments: '',
          specialPermissions: '',
        },
      }
    );

    // Revert collection validator to original
    await db.command({
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['username', 'email', 'status'],
          properties: {
            username: {
              bsonType: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Username must be a string between 3-50 characters',
            },
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'Email must be a valid email address',
            },
            firstName: {
              bsonType: 'string',
              maxLength: 100,
              description: 'First name must be a string with max 100 characters',
            },
            lastName: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Last name must be a string with max 100 characters',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Status must be one of: active, inactive, suspended',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Deletion timestamp for soft delete',
            },
            lastLoginAt: {
              bsonType: ['date', 'null'],
              description: 'Last login timestamp',
            },
            createdAt: {
              bsonType: 'date',
              description: 'Creation timestamp',
            },
            updatedAt: {
              bsonType: 'date',
              description: 'Last update timestamp',
            },
          },
        },
      },
    });

    console.log('Rollback completed!');
  }
};
