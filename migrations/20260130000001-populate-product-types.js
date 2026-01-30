/**
 * Migration: Populate product_types collection from ProductType enum
 * Date: 2026-01-30
 * Purpose: Convert hardcoded ProductType enum to dynamic database records
 */

const { ObjectId } = require('mongodb');

// Product type definitions from the enum with descriptions
const PRODUCT_TYPES = [
  // Raw materials and components
  {
    code: 'raw_material',
    name: 'Raw Material',
    description: 'Raw materials used in manufacturing processes',
    isActive: true,
    attributes: [],
  },
  {
    code: 'component',
    name: 'Component',
    description: 'Components and parts used in assembly',
    isActive: true,
    attributes: [],
  },
  {
    code: 'ingredient',
    name: 'Ingredient',
    description: 'Ingredients used in food and beverage production',
    isActive: true,
    attributes: [],
  },

  // Manufacturing and production
  {
    code: 'finished_good',
    name: 'Finished Good',
    description: 'Completed products ready for sale',
    isActive: true,
    attributes: [],
  },
  {
    code: 'semi_finished',
    name: 'Semi-Finished',
    description: 'Partially completed products',
    isActive: true,
    attributes: [],
  },
  {
    code: 'work_in_progress',
    name: 'Work in Progress',
    description: 'Products currently being manufactured',
    isActive: true,
    attributes: [],
  },
  {
    code: 'by_product',
    name: 'By-Product',
    description: 'Secondary products from manufacturing processes',
    isActive: true,
    attributes: [],
  },

  // Packaging and containers
  {
    code: 'packaging',
    name: 'Packaging',
    description: 'Packaging materials',
    isActive: true,
    attributes: [],
  },
  {
    code: 'container',
    name: 'Container',
    description: 'Containers for storage and transport',
    isActive: true,
    attributes: [],
  },

  // Maintenance and operations
  {
    code: 'consumable',
    name: 'Consumable',
    description: 'Consumable items for daily operations',
    isActive: true,
    attributes: [],
  },
  {
    code: 'spare_part',
    name: 'Spare Part',
    description: 'Spare parts for maintenance',
    isActive: true,
    attributes: [],
  },
  {
    code: 'tool',
    name: 'Tool',
    description: 'Tools and equipment',
    isActive: true,
    attributes: [],
  },
  {
    code: 'equipment',
    name: 'Equipment',
    description: 'Equipment and machinery',
    isActive: true,
    attributes: [],
  },
  {
    code: 'machinery',
    name: 'Machinery',
    description: 'Heavy machinery and industrial equipment',
    isActive: true,
    attributes: [],
  },

  // Trade goods (Vietnam specific)
  {
    code: 'merchandise',
    name: 'Merchandise',
    description: 'Hàng hóa thương mại',
    isActive: true,
    attributes: [],
  },
  {
    code: 'agricultural',
    name: 'Agricultural',
    description: 'Nông sản',
    isActive: true,
    attributes: [],
  },
  {
    code: 'seafood',
    name: 'Seafood',
    description: 'Thủy sản',
    isActive: true,
    attributes: [],
  },
  {
    code: 'handicraft',
    name: 'Handicraft',
    description: 'Thủ công mỹ nghệ',
    isActive: true,
    attributes: [],
  },
  {
    code: 'textile',
    name: 'Textile',
    description: 'Hàng dệt may',
    isActive: true,
    attributes: [],
  },
  {
    code: 'electronics',
    name: 'Electronics',
    description: 'Điện tử',
    isActive: true,
    attributes: [],
  },
  {
    code: 'furniture',
    name: 'Furniture',
    description: 'Nội thất',
    isActive: true,
    attributes: [],
  },

  // Food and beverage
  {
    code: 'food',
    name: 'Food',
    description: 'Thực phẩm',
    isActive: true,
    attributes: [],
  },
  {
    code: 'beverage',
    name: 'Beverage',
    description: 'Đồ uống',
    isActive: true,
    attributes: [],
  },
  {
    code: 'fresh_produce',
    name: 'Fresh Produce',
    description: 'Nông sản tươi',
    isActive: true,
    attributes: [],
  },
  {
    code: 'processed_food',
    name: 'Processed Food',
    description: 'Thực phẩm chế biến',
    isActive: true,
    attributes: [],
  },

  // Healthcare and pharma
  {
    code: 'medicine',
    name: 'Medicine',
    description: 'Thuốc',
    isActive: true,
    attributes: [],
  },
  {
    code: 'medical_device',
    name: 'Medical Device',
    description: 'Thiết bị y tế',
    isActive: true,
    attributes: [],
  },
  {
    code: 'cosmetic',
    name: 'Cosmetic',
    description: 'Mỹ phẩm',
    isActive: true,
    attributes: [],
  },

  // Services and intangibles
  {
    code: 'service',
    name: 'Service',
    description: 'Service products',
    isActive: true,
    attributes: [],
  },
  {
    code: 'digital',
    name: 'Digital',
    description: 'Digital products',
    isActive: true,
    attributes: [],
  },
  {
    code: 'software',
    name: 'Software',
    description: 'Software products',
    isActive: true,
    attributes: [],
  },

  // Other common types
  {
    code: 'book',
    name: 'Book',
    description: 'Sách',
    isActive: true,
    attributes: [],
  },
  {
    code: 'stationery',
    name: 'Stationery',
    description: 'Văn phòng phẩm',
    isActive: true,
    attributes: [],
  },
  {
    code: 'toy',
    name: 'Toy',
    description: 'Đồ chơi',
    isActive: true,
    attributes: [],
  },
  {
    code: 'jewelry',
    name: 'Jewelry',
    description: 'Trang sức',
    isActive: true,
    attributes: [],
  },
  {
    code: 'vehicle',
    name: 'Vehicle',
    description: 'Phương tiện',
    isActive: true,
    attributes: [],
  },
  {
    code: 'spare_vehicle_part',
    name: 'Spare Vehicle Part',
    description: 'Phụ tùng xe',
    isActive: true,
    attributes: [],
  },
];

module.exports = {
  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Starting migration: populate product_types collection...');

    // Create product_types collection if it doesn't exist
    const collections = await db.listCollections({ name: 'product_types' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('product_types');
      console.log('Created product_types collection');
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

    // Insert product types
    const now = new Date();
    const productTypesWithMetadata = PRODUCT_TYPES.map(type => ({
      ...type,
      createdBy: systemUserId,
      updatedBy: systemUserId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      metadata: {},
    }));

    // Create indexes first (idempotent operation)
    await db.collection('product_types').createIndex({ code: 1 }, { unique: true });
    await db.collection('product_types').createIndex({ isActive: 1 });
    await db.collection('product_types').createIndex({ name: 'text', description: 'text', code: 'text' });
    await db.collection('product_types').createIndex({ deletedAt: 1 });
    console.log('Created indexes for product_types collection');

    // Check if any product types already exist
    const existingCount = await db.collection('product_types').countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing product types. Skipping insert to avoid duplicates.`);
      console.log('If you want to re-populate, please drop the product_types collection first.');
      console.log('Migration completed successfully!');
      return;
    }

    const result = await db.collection('product_types').insertMany(productTypesWithMetadata);
    console.log(`Inserted ${result.insertedCount} product types`);

    console.log('Migration completed successfully!');
  },

  /**
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Starting rollback: remove product_types collection...');
    
    // Drop the collection
    await db.collection('product_types').drop();
    console.log('Dropped product_types collection');
    
    console.log('Rollback completed successfully!');
  },
};
