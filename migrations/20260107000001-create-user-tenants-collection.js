module.exports = {
  /**
   * Migration: Add user_tenants collection and update user schema with profile fields
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Creating user_tenants collection...');

    // Create user_tenants collection with validation
    await db.createCollection('user_tenants', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'tenantId', 'role', 'status'],
          properties: {
            userId: {
              bsonType: 'objectId',
              description: 'User ID - required',
            },
            tenantId: {
              bsonType: 'objectId',
              description: 'Tenant/Organization ID - required',
            },
            role: {
              bsonType: 'string',
              enum: ['owner', 'admin', 'member', 'billing'],
              description: 'Tenant role - required',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'invited', 'revoked'],
              description: 'Membership status - required',
            },
            joinedAt: {
              bsonType: ['date', 'null'],
              description: 'Date when user joined the tenant',
            },
            invitedAt: {
              bsonType: ['date', 'null'],
              description: 'Date when user was invited',
            },
            invitedBy: {
              bsonType: ['objectId', 'null'],
              description: 'User ID who invited this member',
            },
            revokedAt: {
              bsonType: ['date', 'null'],
              description: 'Date when membership was revoked',
            },
            revokedBy: {
              bsonType: ['objectId', 'null'],
              description: 'User ID who revoked this membership',
            },
            metadata: {
              bsonType: ['object', 'null'],
              description: 'Additional metadata',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp',
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

    console.log('Creating indexes on user_tenants...');

    // Create indexes
    await db.collection('user_tenants').createIndexes([
      {
        key: { userId: 1, tenantId: 1 },
        name: 'userId_tenantId_unique',
        unique: true,
      },
      {
        key: { userId: 1 },
        name: 'userId_index',
      },
      {
        key: { tenantId: 1 },
        name: 'tenantId_index',
      },
      {
        key: { tenantId: 1, status: 1 },
        name: 'tenantId_status_index',
      },
      {
        key: { userId: 1, status: 1 },
        name: 'userId_status_index',
      },
      {
        key: { tenantId: 1, role: 1 },
        name: 'tenantId_role_index',
      },
      {
        key: { tenantId: 1, userId: 1, status: 1 },
        name: 'tenantId_userId_status_index',
      },
      {
        key: { deletedAt: 1 },
        name: 'deletedAt_ttl_index',
        expireAfterSeconds: 7776000, // 90 days
        partialFilterExpression: { deletedAt: { $ne: null } },
      },
    ]);

    console.log('Updating users collection validator...');

    // Update users collection to add profile fields validation
    await db.command({
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'status'],
          properties: {
            username: {
              bsonType: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Username - unique',
            },
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
              description: 'Email address - required and unique',
            },
            firstName: {
              bsonType: ['string', 'null'],
              maxLength: 100,
              description: 'First name',
            },
            lastName: {
              bsonType: ['string', 'null'],
              maxLength: 100,
              description: 'Last name',
            },
            fullName: {
              bsonType: ['string', 'null'],
              minLength: 2,
              description: 'Full name',
            },
            displayName: {
              bsonType: ['string', 'null'],
              maxLength: 200,
              description: 'Display name',
            },
            phone: {
              bsonType: ['string', 'null'],
              description: 'Phone number',
            },
            avatarUrl: {
              bsonType: ['string', 'null'],
              description: 'Avatar URL',
            },
            password: {
              bsonType: ['string', 'null'],
              description: 'Hashed password',
            },
            status: {
              bsonType: 'string',
              enum: ['pending', 'active', 'inactive', 'suspended'],
              description: 'User status - required',
            },
            verifiedAt: {
              bsonType: ['date', 'null'],
              description: 'Email verification timestamp',
            },
            lastLoginAt: {
              bsonType: ['date', 'null'],
              description: 'Last login timestamp',
            },
            metadata: {
              bsonType: ['object', 'null'],
              description: 'Additional metadata',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp',
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
      validationLevel: 'moderate',
    });

    console.log('Migration completed successfully');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Dropping user_tenants collection...');
    await db.collection('user_tenants').drop();

    console.log('Reverting users collection validator...');
    // Revert to previous validator (simplified version)
    await db.command({
      collMod: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'status'],
          properties: {
            username: {
              bsonType: 'string',
              minLength: 3,
              maxLength: 50,
            },
            email: {
              bsonType: 'string',
              pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            },
            status: {
              bsonType: 'string',
              enum: ['pending', 'active', 'inactive', 'suspended'],
            },
          },
        },
      },
      validationLevel: 'moderate',
    });

    console.log('Rollback completed successfully');
  },
};
