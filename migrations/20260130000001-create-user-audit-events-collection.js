module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create user_audit_events collection with validation
    await db.createCollection('user_audit_events', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['action', 'userId', 'resource'],
          properties: {
            action: {
              bsonType: 'string',
              enum: [
                'user.login',
                'user.logout',
                'user.login.failed',
                'user.session.expired',
                'user.created',
                'user.updated',
                'user.deleted',
                'user.profile.updated',
                'user.email.changed',
                'user.password.changed',
                'user.password.reset',
                'user.password.reset.admin',
                'user.blocked',
                'user.unblocked',
                'user.activated',
                'user.deactivated',
                'user.sessions.revoked',
                'user.sessions.revoked.admin',
                'user.role.granted',
                'user.role.revoked',
                'user.permission.granted',
                'user.permission.revoked',
                'user.organization.joined',
                'user.organization.left',
                'user.organization.removed',
              ],
              description: 'Type of audit action',
            },
            userId: {
              bsonType: 'objectId',
              description: 'User ID being audited',
            },
            performedBy: {
              bsonType: 'objectId',
              description: 'User who performed the action (optional)',
            },
            resource: {
              bsonType: 'string',
              description: 'Resource being acted upon',
            },
            payload: {
              bsonType: 'object',
              description: 'Event data payload (optional)',
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
            status: {
              bsonType: 'string',
              enum: ['success', 'failure', 'pending'],
              description: 'Status of the action',
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
      .collection('user_audit_events')
      .createIndex({ userId: 1, createdAt: -1 });
    await db
      .collection('user_audit_events')
      .createIndex({ action: 1, createdAt: -1 });
    await db
      .collection('user_audit_events')
      .createIndex({ performedBy: 1, createdAt: -1 });
    await db
      .collection('user_audit_events')
      .createIndex({ userId: 1, action: 1 });
    await db
      .collection('user_audit_events')
      .createIndex({ userId: 1, status: 1 });
    await db
      .collection('user_audit_events')
      .createIndex({ resource: 1, createdAt: -1 });

    // Text index for search functionality
    await db
      .collection('user_audit_events')
      .createIndex(
        { action: 'text', resource: 'text', description: 'text' },
        { name: 'user_audit_events_text_search' },
      );

    // TTL index to auto-delete old audit logs after 2 years
    await db.collection('user_audit_events').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 63072000, name: 'user_audit_events_ttl' },
    );

    console.log('User audit events collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the user_audit_events collection
    await db.collection('user_audit_events').drop();
    console.log('User audit events collection dropped');
  },
};
