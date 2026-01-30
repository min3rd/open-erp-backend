/**
 * Migration: Create product_categories collection and seed initial categories
 * Date: 2026-01-30
 * Purpose: Set up hierarchical product category structure
 */

const { ObjectId } = require('mongodb');

// Sample product categories with hierarchical structure
const SAMPLE_CATEGORIES = [
  // Root categories
  {
    code: 'electronics',
    name: 'Electronics',
    description: 'Electronic devices and components',
    parentId: null,
    order: 1,
    isActive: true,
  },
  {
    code: 'food-beverage',
    name: 'Food & Beverage',
    description: 'Food and beverage products',
    parentId: null,
    order: 2,
    isActive: true,
  },
  {
    code: 'textiles',
    name: 'Textiles',
    description: 'Textile and clothing products',
    parentId: null,
    order: 3,
    isActive: true,
  },
  {
    code: 'industrial',
    name: 'Industrial',
    description: 'Industrial materials and equipment',
    parentId: null,
    order: 4,
    isActive: true,
  },
];

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: create product_categories collection...');

    // Create product_categories collection if it doesn't exist
    const collections = await db.listCollections({ name: 'product_categories' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('product_categories');
      console.log('Created product_categories collection');
    }

    // Get system user ID (or create a placeholder)
    let systemUserId;
    const systemUser = await db.collection('users').findOne({ email: 'system@example.com' });
    if (systemUser) {
      systemUserId = systemUser._id;
    } else {
      // Use a placeholder ObjectId for system operations
      systemUserId = new ObjectId('000000000000000000000000');
    }

    // Check if any categories already exist
    const existingCount = await db.collection('product_categories').countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing product categories. Skipping insert to avoid duplicates.`);
      console.log('If you want to re-populate, please drop the product_categories collection first.');
    } else {
      // Insert sample categories
      const now = new Date();
      const categoriesWithMetadata = SAMPLE_CATEGORIES.map(category => {
        const id = new ObjectId();
        return {
          _id: id,
          ...category,
          path: `/${id}/`,
          level: 0,
          createdBy: systemUserId,
          updatedBy: systemUserId,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          metadata: {},
        };
      });

      const result = await db.collection('product_categories').insertMany(categoriesWithMetadata);
      console.log(`Inserted ${result.insertedCount} sample product categories`);
    }

    // Create indexes
    await db.collection('product_categories').createIndex({ code: 1 }, { unique: true });
    await db.collection('product_categories').createIndex({ parentId: 1, order: 1 });
    await db.collection('product_categories').createIndex({ path: 1 });
    await db.collection('product_categories').createIndex({ isActive: 1 });
    await db.collection('product_categories').createIndex({ name: 'text', description: 'text', code: 'text' });
    await db.collection('product_categories').createIndex({ deletedAt: 1 });
    console.log('Created indexes for product_categories collection');

    console.log('Migration completed successfully!');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Starting rollback: remove product_categories collection...');
    
    // Drop the collection
    await db.collection('product_categories').drop();
    console.log('Dropped product_categories collection');
    
    console.log('Rollback completed successfully!');
  },
};
