module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create tenants collection with validation
    await db.createCollection('tenants', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'slug', 'status'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Tenant name must be a string between 2-100 characters',
            },
            slug: {
              bsonType: 'string',
              pattern: '^[a-z0-9-]+$',
              description: 'Slug must be lowercase alphanumeric with hyphens',
            },
            description: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Description must be a string with max 500 characters',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'suspended', 'trial'],
              description: 'Status must be one of: active, inactive, suspended, trial',
            },
            settings: {
              bsonType: 'object',
              description: 'Settings as key-value pairs',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Deletion timestamp for soft delete',
            },
            trialExpiresAt: {
              bsonType: ['date', 'null'],
              description: 'Trial expiration timestamp',
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
    await db.collection('tenants').createIndex({ name: 1 }, { unique: true });
    await db.collection('tenants').createIndex({ slug: 1 }, { unique: true });
    await db.collection('tenants').createIndex({ status: 1 });
    await db.collection('tenants').createIndex({ name: 1, status: 1 });
    await db.collection('tenants').createIndex({ slug: 1, status: 1 });

    // Text index for search
    await db.collection('tenants').createIndex(
      {
        name: 'text',
        description: 'text',
      },
      { name: 'tenant_text_search' }
    );

    // TTL index for soft-deleted tenants (auto-delete after 365 days)
    await db.collection('tenants').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 31536000, name: 'tenant_deleted_ttl' }
    );

    console.log('Tenants collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the tenants collection
    await db.collection('tenants').drop();
    console.log('Tenants collection dropped');
  }
};
