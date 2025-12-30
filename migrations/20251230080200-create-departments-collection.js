module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create departments collection with validation
    await db.createCollection('departments', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['tenantId', 'name', 'code', 'status'],
          properties: {
            tenantId: {
              bsonType: 'objectId',
              description: 'Tenant ID is required',
            },
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Department name must be a string between 2-100 characters',
            },
            code: {
              bsonType: 'string',
              pattern: '^[a-z0-9-]+$',
              description: 'Code must be lowercase alphanumeric with hyphens',
            },
            description: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Description must be a string with max 500 characters',
            },
            parentId: {
              bsonType: ['objectId', 'null'],
              description: 'Parent department ID for hierarchy',
            },
            managerId: {
              bsonType: ['objectId', 'null'],
              description: 'Manager user ID',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive'],
              description: 'Status must be either active or inactive',
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
    // Unique index for code within tenant
    await db.collection('departments').createIndex(
      { tenantId: 1, code: 1 },
      { unique: true, name: 'department_tenant_code' }
    );

    await db.collection('departments').createIndex({ tenantId: 1, name: 1 });
    await db.collection('departments').createIndex({ tenantId: 1, status: 1 });
    await db.collection('departments').createIndex({ tenantId: 1, parentId: 1 });

    // Text index for search
    await db.collection('departments').createIndex(
      {
        name: 'text',
        description: 'text',
        code: 'text',
      },
      { name: 'department_text_search' }
    );

    // TTL index for soft-deleted departments (auto-delete after 90 days)
    await db.collection('departments').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 7776000, name: 'department_deleted_ttl' }
    );

    console.log('Departments collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the departments collection
    await db.collection('departments').drop();
    console.log('Departments collection dropped');
  }
};
