module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create organizations collection with validation
    await db.createCollection('organizations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'type',
            'name',
            'taxId',
            'headquartersAddress',
            'legalRepresentative',
            'contactPhone',
            'contactEmail',
            'foundedDate',
            'status',
            'country',
            'createdBy',
          ],
          properties: {
            type: {
              bsonType: 'string',
              enum: ['holding', 'company', 'joint-venture', 'partner', 'branch'],
              description: 'Organization type',
            },
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 200,
              description: 'Organization name',
            },
            internationalName: {
              bsonType: 'string',
              maxLength: 200,
              description: 'International name',
            },
            taxId: {
              bsonType: 'string',
              description: 'Tax identification number',
            },
            headquartersAddress: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Headquarters address',
            },
            legalRepresentative: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 200,
              description: 'Legal representative name',
            },
            contactPhone: {
              bsonType: 'string',
              description: 'Contact phone number',
            },
            contactEmail: {
              bsonType: 'string',
              description: 'Contact email address',
            },
            foundedDate: {
              bsonType: 'date',
              description: 'Foundation date',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'suspended', 'pending'],
              description: 'Organization status',
            },
            country: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 2,
              description: 'Country code (ISO 3166-1 alpha-2)',
            },
            description: {
              bsonType: 'string',
              maxLength: 1000,
              description: 'Organization description',
            },
            website: {
              bsonType: 'string',
              description: 'Organization website',
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
              description: 'User who created the organization',
            },
            updatedBy: {
              bsonType: 'objectId',
              description: 'User who last updated the organization',
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
      .collection('organizations')
      .createIndex({ taxId: 1, country: 1 }, { unique: true });
    await db.collection('organizations').createIndex({ name: 1, status: 1 });
    await db.collection('organizations').createIndex({ type: 1, status: 1 });
    await db.collection('organizations').createIndex({ status: 1 });
    await db.collection('organizations').createIndex({ createdBy: 1 });

    // Text index for search
    await db.collection('organizations').createIndex(
      {
        name: 'text',
        internationalName: 'text',
        description: 'text',
      },
      { name: 'organizations_text_search' },
    );

    // TTL index for soft-deleted organizations (auto-delete after 730 days)
    await db.collection('organizations').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 63072000, name: 'organizations_deleted_ttl' },
    );

    console.log('Organizations collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the organizations collection
    await db.collection('organizations').drop();
    console.log('Organizations collection dropped');
  },
};
