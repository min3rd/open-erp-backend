module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create organization_audit_events collection with validation
    await db.createCollection('organization_audit_events', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['eventType', 'organizationId', 'userId', 'eventData'],
          properties: {
            eventType: {
              bsonType: 'string',
              enum: [
                'organization.created',
                'organization.updated',
                'organization.deleted',
                'organization.restored',
                'relation.created',
                'relation.updated',
                'relation.deleted',
                'member.invited',
                'member.joined',
                'member.role_updated',
                'member.removed',
                'invitation.accepted',
                'invitation.rejected',
                'invitation.revoked',
                'invitation.expired',
              ],
              description: 'Type of audit event',
            },
            organizationId: {
              bsonType: 'objectId',
              description: 'Organization ID',
            },
            userId: {
              bsonType: 'objectId',
              description: 'User who performed the action',
            },
            eventData: {
              bsonType: 'object',
              description: 'Event data payload',
            },
            description: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Human-readable event description',
            },
            ipAddress: {
              bsonType: 'string',
              description: 'IP address of the user',
            },
            userAgent: {
              bsonType: 'string',
              description: 'User agent string',
            },
            metadata: {
              bsonType: 'object',
              description: 'Additional metadata',
            },
            createdAt: {
              bsonType: 'date',
              description: 'Event timestamp',
            },
            updatedAt: {
              bsonType: 'date',
              description: 'Last update timestamp',
            },
          },
        },
      },
    });

    // Create indexes for efficient querying
    await db
      .collection('organization_audit_events')
      .createIndex({ organizationId: 1, createdAt: -1 });
    await db
      .collection('organization_audit_events')
      .createIndex({ userId: 1, createdAt: -1 });
    await db
      .collection('organization_audit_events')
      .createIndex({ eventType: 1, createdAt: -1 });
    await db
      .collection('organization_audit_events')
      .createIndex({ organizationId: 1, eventType: 1 });

    // TTL index to auto-delete old audit logs after 2 years
    await db.collection('organization_audit_events').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 63072000, name: 'audit_events_ttl' },
    );

    console.log('Organization audit events collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the organization_audit_events collection
    await db.collection('organization_audit_events').drop();
    console.log('Organization audit events collection dropped');
  },
};
