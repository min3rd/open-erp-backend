module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create roles collection with validation
    await db.createCollection('roles', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'code', 'scope', 'permissions', 'status'],
          properties: {
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Role name must be a string between 2-100 characters',
            },
            code: {
              bsonType: 'string',
              pattern: '^[A-Z0-9_]+$',
              description: 'Code must be uppercase alphanumeric with underscores',
            },
            description: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Description must be a string with max 500 characters',
            },
            scope: {
              bsonType: 'string',
              enum: ['global', 'tenant'],
              description: 'Scope must be either global or tenant',
            },
            tenantId: {
              bsonType: ['objectId', 'null'],
              description: 'Tenant ID for tenant-scoped roles',
            },
            permissions: {
              bsonType: 'array',
              items: {
                bsonType: 'string',
                pattern: '^[a-z]+\\.[a-z]+$',
                description: 'Permission must be in format: resource.action',
              },
              description: 'Array of permission strings',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive'],
              description: 'Status must be either active or inactive',
            },
            isSystem: {
              bsonType: 'bool',
              description: 'System roles cannot be deleted or modified',
            },
            metadata: {
              bsonType: 'object',
              description: 'Metadata as key-value pairs',
            },
            deletedAt: {
              bsonType: ['date', 'null'],
              description: 'Deletion timestamp for soft delete',
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
    // Unique index for code + scope + tenantId combination
    await db.collection('roles').createIndex(
      { code: 1, scope: 1, tenantId: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null },
        name: 'role_unique_code',
      }
    );

    await db.collection('roles').createIndex({ scope: 1, status: 1 });
    await db.collection('roles').createIndex({ tenantId: 1, status: 1 });
    await db.collection('roles').createIndex({ tenantId: 1, scope: 1 });

    // Text index for search
    await db.collection('roles').createIndex(
      {
        name: 'text',
        description: 'text',
        code: 'text',
      },
      { name: 'role_text_search' }
    );

    // TTL index for soft-deleted roles (auto-delete after 90 days)
    await db.collection('roles').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 7776000, name: 'role_deleted_ttl' }
    );

    console.log('Roles collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the roles collection
    await db.collection('roles').drop();
    console.log('Roles collection dropped');
  }
};
