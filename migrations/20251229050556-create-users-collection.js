module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create users collection with validation
    await db.createCollection('users', {
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

    // Create indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ status: 1 });
    await db.collection('users').createIndex({ email: 1, status: 1 });
    await db.collection('users').createIndex({ username: 1, status: 1 });
    
    // Text index for search
    await db.collection('users').createIndex(
      {
        username: 'text',
        email: 'text',
        firstName: 'text',
        lastName: 'text',
      },
      { name: 'user_text_search' }
    );

    // TTL index for soft-deleted users (auto-delete after 90 days)
    await db.collection('users').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 7776000, name: 'deleted_ttl' }
    );

    console.log('Users collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the users collection
    await db.collection('users').drop();
    console.log('Users collection dropped');
  }
};
