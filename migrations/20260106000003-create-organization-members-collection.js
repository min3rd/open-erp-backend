module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create organization_members collection with validation
    await db.createCollection('organization_members', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'organizationId',
            'userId',
            'roles',
            'status',
            'joinedAt',
            'createdBy',
          ],
          properties: {
            organizationId: {
              bsonType: 'objectId',
              description: 'Organization ID',
            },
            userId: {
              bsonType: 'objectId',
              description: 'User ID',
            },
            roles: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                enum: ['owner', 'admin', 'member', 'finance'],
              },
              minItems: 1,
              description: 'Member roles',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Member status',
            },
            joinedAt: {
              bsonType: 'date',
              description: 'Date when member joined',
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
              bsonType: 'object',
              description: 'Additional metadata',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp',
            },
            createdBy: {
              bsonType: 'objectId',
              description: 'User who created the membership',
            },
            updatedBy: {
              bsonType: 'objectId',
              description: 'User who last updated the membership',
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

    // Create indexes
    // Ensure one user can only have one membership per organization
    await db
      .collection('organization_members')
      .createIndex(
        { organizationId: 1, userId: 1 },
        { unique: true, name: 'unique_org_user_membership' },
      );

    await db
      .collection('organization_members')
      .createIndex({ organizationId: 1, status: 1 });
    await db
      .collection('organization_members')
      .createIndex({ userId: 1, status: 1 });
    await db
      .collection('organization_members')
      .createIndex({ organizationId: 1, roles: 1 });
    await db.collection('organization_members').createIndex({ status: 1 });

    // Index to ensure only one primary owner per organization
    await db.collection('organization_members').createIndex(
      { organizationId: 1, isPrimaryOwner: 1 },
      {
        unique: true,
        partialFilterExpression: {
          isPrimaryOwner: true,
          deletedAt: null,
        },
        name: 'unique_primary_owner',
      },
    );

    // TTL index for soft-deleted memberships
    await db.collection('organization_members').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 63072000, name: 'org_members_deleted_ttl' },
    );

    console.log('Organization members collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the organization_members collection
    await db.collection('organization_members').drop();
    console.log('Organization members collection dropped');
  },
};
