module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create organization_relations collection with validation
    await db.createCollection('organization_relations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'parentId',
            'childId',
            'relationType',
            'effectiveDate',
            'status',
            'createdBy',
          ],
          properties: {
            parentId: {
              bsonType: 'objectId',
              description: 'Parent organization ID',
            },
            childId: {
              bsonType: 'objectId',
              description: 'Child organization ID',
            },
            relationType: {
              bsonType: 'string',
              enum: [
                'owner-subsidiary',
                'joint-venture',
                'partner',
                'branch',
                'affiliated',
              ],
              description: 'Type of relationship',
            },
            sharePercentage: {
              bsonType: ['double', 'int'],
              minimum: 0,
              maximum: 100,
              description: 'Ownership percentage (0-100)',
            },
            effectiveDate: {
              bsonType: 'date',
              description: 'Date when relation became effective',
            },
            endDate: {
              bsonType: ['date', 'null'],
              description: 'Date when relation ended',
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'inactive', 'pending', 'dissolved'],
              description: 'Relation status',
            },
            notes: {
              bsonType: 'string',
              maxLength: 1000,
              description: 'Additional notes',
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
              description: 'User who created the relation',
            },
            updatedBy: {
              bsonType: 'objectId',
              description: 'User who last updated the relation',
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
    // Ensure uniqueness: one parent-child pair can only have one active relation
    await db.collection('organization_relations').createIndex(
      { parentId: 1, childId: 1, deletedAt: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null },
        name: 'unique_active_parent_child',
      },
    );

    await db
      .collection('organization_relations')
      .createIndex({ parentId: 1, status: 1 });
    await db
      .collection('organization_relations')
      .createIndex({ childId: 1, status: 1 });
    await db
      .collection('organization_relations')
      .createIndex({ relationType: 1, status: 1 });
    await db.collection('organization_relations').createIndex({ status: 1 });
    await db.collection('organization_relations').createIndex({ createdBy: 1 });

    // TTL index for soft-deleted relations
    await db.collection('organization_relations').createIndex(
      { deletedAt: 1 },
      { expireAfterSeconds: 63072000, name: 'org_relations_deleted_ttl' },
    );

    console.log('Organization relations collection created with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the organization_relations collection
    await db.collection('organization_relations').drop();
    console.log('Organization relations collection dropped');
  },
};
