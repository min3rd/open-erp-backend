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

    // Update collection validator to include new fields
    // Note: tenantId is optional - users can create their own tenant or be invited to one
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
              enum: ['pending', 'active', 'inactive', 'suspended'],
              description: 'Status must be one of: pending, active, inactive, suspended',
            },
            tenantId: {
              bsonType: ['objectId', 'null'],
              description: 'Tenant ID for multi-tenancy (optional until user creates/joins a tenant)',
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

    // Initialize new fields for existing users (tenantId remains null)
    await db.collection('users').updateMany(
      { 
        $or: [
          { roleAssignments: { $exists: false } },
          { specialPermissions: { $exists: false } }
        ]
      },
      {
        $set: {
          roleAssignments: [],
          specialPermissions: [],
        },
        $setOnInsert: {
          tenantId: null,
        }
      }
    );

    console.log('Initialized roleAssignments and specialPermissions for existing users');

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
