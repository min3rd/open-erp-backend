module.exports = {
  /**
   * Migration: Update organization_members collection with invite/revoke fields
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Updating organization_members collection with new fields...');

    // Update the validator to add new fields
    await db.command({
      collMod: 'organization_members',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['organizationId', 'userId', 'roles', 'status', 'createdBy'],
          properties: {
            organizationId: {
              bsonType: 'objectId',
              description: 'Organization/Tenant ID - required',
            },
            userId: {
              bsonType: 'objectId',
              description: 'User ID - required',
            },
            roles: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                enum: ['owner', 'admin', 'member', 'finance'],
              },
              minItems: 1,
              description: 'Member roles - required',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'invited', 'revoked', 'inactive', 'suspended'],
              description: 'Member status - required',
            },
            joinedAt: {
              bsonType: ['date', 'null'],
              description: 'Date when member joined',
            },
            invitedAt: {
              bsonType: ['date', 'null'],
              description: 'Date when member was invited',
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
            leftAt: {
              bsonType: ['date', 'null'],
              description: 'Date when member left',
            },
            isPrimaryOwner: {
              bsonType: 'bool',
              description: 'Whether this is the primary owner',
            },
            metadata: {
              bsonType: ['object', 'null'],
              description: 'Additional metadata',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp',
            },
            createdBy: {
              bsonType: 'objectId',
              description: 'User ID who created this membership - required',
            },
            updatedBy: {
              bsonType: ['objectId', 'null'],
              description: 'User ID who last updated this membership',
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
    console.log('Reverting organization_members collection validator...');
    // Revert to previous validator (without new fields)
    await db.command({
      collMod: 'organization_members',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['organizationId', 'userId', 'roles', 'status', 'joinedAt', 'createdBy'],
          properties: {
            organizationId: {
              bsonType: 'objectId',
            },
            userId: {
              bsonType: 'objectId',
            },
            roles: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                enum: ['owner', 'admin', 'member', 'finance'],
              },
              minItems: 1,
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'suspended'],
            },
            joinedAt: {
              bsonType: 'date',
            },
            createdBy: {
              bsonType: 'objectId',
            },
          },
        },
      },
      validationLevel: 'moderate',
    });

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
