module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create organization_invitations collection with validation
    await db.createCollection('organization_invitations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'organizationId',
            'roles',
            'scope',
            'tokenHash',
            'status',
            'expiresAt',
            'invitedBy',
          ],
          properties: {
            organizationId: {
              bsonType: 'objectId',
              description: 'Organization ID',
            },
            inviteeEmail: {
              bsonType: 'string',
              description: 'Invitee email address',
            },
            inviteeUsername: {
              bsonType: 'string',
              description: 'Invitee username',
            },
            inviteeUserId: {
              bsonType: 'objectId',
              description: 'Invitee user ID (if resolved)',
            },
            roles: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
              },
              minItems: 1,
              description: 'Roles to assign on acceptance',
            },
            scope: {
              bsonType: 'string',
              enum: ['organization', 'organization-and-children'],
              description: 'Invitation scope',
            },
            tokenHash: {
              bsonType: 'string',
              description: 'Hashed invitation token',
            },
            status: {
              bsonType: 'string',
              enum: ['pending', 'accepted', 'rejected', 'expired', 'revoked'],
              description: 'Invitation status',
            },
            expiresAt: {
              bsonType: 'date',
              description: 'Expiration timestamp',
            },
            acceptedAt: {
              bsonType: ['date', 'null'],
              description: 'Acceptance timestamp',
            },
            revokedAt: {
              bsonType: ['date', 'null'],
              description: 'Revocation timestamp',
            },
            message: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Optional invitation message',
            },
            metadata: {
              bsonType: 'object',
              description: 'Additional metadata',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Soft delete timestamp',
            },
            invitedBy: {
              bsonType: 'objectId',
              description: 'User who sent the invitation',
            },
            acceptedBy: {
              bsonType: 'objectId',
              description: 'User who accepted the invitation',
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
    await db
      .collection('organization_invitations')
      .createIndex({ organizationId: 1, status: 1 });
    await db
      .collection('organization_invitations')
      .createIndex({ inviteeEmail: 1, status: 1 });
    await db
      .collection('organization_invitations')
      .createIndex({ inviteeUsername: 1, status: 1 });
    await db
      .collection('organization_invitations')
      .createIndex({ inviteeUserId: 1, status: 1 });
    await db
      .collection('organization_invitations')
      .createIndex({ tokenHash: 1 }, { unique: true });
    await db
      .collection('organization_invitations')
      .createIndex({ expiresAt: 1, status: 1 });
    await db.collection('organization_invitations').createIndex({ status: 1 });

    // Prevent duplicate pending invitations for same email to same org
    await db.collection('organization_invitations').createIndex(
      { organizationId: 1, inviteeEmail: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: 'pending',
          inviteeEmail: { $exists: true, $ne: null },
        },
        name: 'unique_pending_email_invitation',
      },
    );

    // Prevent duplicate pending invitations for same username to same org
    await db.collection('organization_invitations').createIndex(
      { organizationId: 1, inviteeUsername: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: 'pending',
          inviteeUsername: { $exists: true, $ne: null },
        },
        name: 'unique_pending_username_invitation',
      },
    );

    // TTL index to auto-delete expired invitations after 30 days
    await db.collection('organization_invitations').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 2592000, name: 'invitations_expiry_ttl' },
    );

    // TTL index for soft-deleted invitations
    await db.collection('organization_invitations').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 7776000, name: 'invitations_deleted_ttl' },
    );

    console.log('Organization invitations collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the organization_invitations collection
    await db.collection('organization_invitations').drop();
    console.log('Organization invitations collection dropped');
  },
};
