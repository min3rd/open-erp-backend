module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    // Create navigations collection with validation
    await db.createCollection('navigations', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'label', 'scope', 'createdBy', 'updatedBy'],
          properties: {
            id: {
              bsonType: 'string',
              description: 'Unique identifier for the navigation item',
            },
            label: {
              bsonType: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Display label for the navigation item',
            },
            icon: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Icon identifier',
            },
            subtitle: {
              bsonType: 'string',
              maxLength: 300,
              description: 'Subtitle or description text',
            },
            routerLink: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Angular router link path',
            },
            url: {
              bsonType: 'string',
              maxLength: 1000,
              description: 'External URL',
            },
            permissions: {
              bsonType: 'object',
              description: 'Permission configuration for access control',
              properties: {
                include: {
                  bsonType: 'array',
                  items: { bsonType: 'string' },
                  description: 'Array of required permissions',
                },
                exclude: {
                  bsonType: 'array',
                  items: { bsonType: 'string' },
                  description: 'Array of excluded permissions',
                },
              },
            },
            command: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Client-side command function name',
            },
            items: {
              bsonType: 'array',
              items: { bsonType: 'string' },
              description: 'Array of child navigation IDs',
            },
            disabled: {
              bsonType: 'bool',
              description: 'Whether the item is disabled',
            },
            target: {
              bsonType: 'string',
              maxLength: 50,
              description: 'Link target attribute',
            },
            badge: {
              bsonType: 'string',
              maxLength: 50,
              description: 'Badge text or number',
            },
            tooltip: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Tooltip text',
            },
            shortcut: {
              bsonType: 'string',
              maxLength: 50,
              description: 'Keyboard shortcut',
            },
            class: {
              bsonType: 'string',
              maxLength: 200,
              description: 'CSS class',
            },
            iconStyle: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Inline styles for icon',
            },
            iconClass: {
              bsonType: 'string',
              maxLength: 200,
              description: 'CSS class for icon',
            },
            labelStyle: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Inline styles for label',
            },
            labelClass: {
              bsonType: 'string',
              maxLength: 200,
              description: 'CSS class for label',
            },
            linkStyle: {
              bsonType: 'string',
              maxLength: 500,
              description: 'Inline styles for link',
            },
            linkClass: {
              bsonType: 'string',
              maxLength: 200,
              description: 'CSS class for link',
            },
            order: {
              bsonType: 'number',
              description: 'Order/position among siblings',
            },
            scope: {
              bsonType: 'string',
              enum: ['global', 'module'],
              description: 'Scope of the navigation item',
            },
            module: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Module key when scope is module',
            },
            parentId: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Parent navigation item ID',
            },
            meta: {
              bsonType: 'object',
              description: 'Free-form metadata',
            },
            createdBy: {
              bsonType: 'string',
              description: 'User ID who created this item',
            },
            updatedBy: {
              bsonType: 'string',
              description: 'User ID who last updated this item',
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

    // Create indexes for efficient queries
    await db.collection('navigations').createIndex({ id: 1 }, { unique: true });
    await db.collection('navigations').createIndex({ scope: 1, module: 1, order: 1 });
    await db.collection('navigations').createIndex({ scope: 1, parentId: 1 });
    await db.collection('navigations').createIndex({ module: 1, order: 1 });
    await db.collection('navigations').createIndex({ parentId: 1 });
    await db.collection('navigations').createIndex(
      { label: 'text', command: 'text' },
      { name: 'navigation_text_search' }
    );

    console.log('Navigations collection created successfully with indexes');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    // Drop the navigations collection
    await db.collection('navigations').drop();
    console.log('Navigations collection dropped successfully');
  },
};
