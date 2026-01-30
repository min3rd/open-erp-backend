#!/usr/bin/env ts-node

/**
 * Seed product types (master data)
 *
 * Usage:
 *   ts-node scripts/seeds/seed-product-types.ts [options]
 *
 * Options:
 *   --drop              Drop existing product types before seeding
 *   --dry-run           Validate without writing to database
 */

import 'tsconfig-paths/register';
import { connect, connection, Model } from 'mongoose';
import { ProductType, ProductTypeSchema } from '@shared/schemas';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import { ObjectId } from 'mongodb';

require('dotenv').config();

interface SeedOptions {
  drop?: boolean;
  dryRun?: boolean;
}

interface SeedStats {
  total: number;
  inserted: number;
  errors: number;
}

function parseArgs(): SeedOptions {
  const opts: SeedOptions = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--drop':
        opts.drop = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
    }
  }

  return opts;
}

/**
 * Connect to MongoDB
 */
async function connectToDatabase(): Promise<void> {
  const dbConfig = getDatabaseConfig();
  const mongooseOpts = getMongooseOptions(dbConfig) as any;
  const connectUri = dbConfig.uri;

  console.log(`Connecting to MongoDB...`);
  console.log(`  Database: ${mongooseOpts.dbName}`);

  try {
    await connect(connectUri, {
      dbName: mongooseOpts.dbName,
      auth: mongooseOpts.auth,
      authSource: mongooseOpts.authSource,
    });
    console.log('✓ Connected to MongoDB');
  } catch (err: any) {
    console.error('Connection failed:', err?.message || err);
    throw err;
  }
}

/**
 * Product type definitions from the enum
 */
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

/**
 * Seed product types
 */
export async function seedProductTypes(
  opts: SeedOptions = {},
): Promise<SeedStats> {
  const stats: SeedStats = {
    total: PRODUCT_TYPES.length,
    inserted: 0,
    errors: 0,
  };

  console.log('\n📦 Seeding Product Types...');
  console.log(`  Total types to seed: ${stats.total}`);
  console.log(`  Options:`, opts);

  if (opts.dryRun) {
    console.log('  DRY RUN MODE - No changes will be made\n');
    return stats;
  }

  const ProductTypeModel: Model<ProductType> = connection.model(
    'ProductType',
    ProductTypeSchema,
  );

  // Drop existing data if requested
  if (opts.drop) {
    console.log('  Dropping existing product types...');
    await ProductTypeModel.deleteMany({});
    console.log('  ✓ Dropped existing product types');
  }

  // Get system user ID or use placeholder
  const systemUserId = new ObjectId('000000000000000000000000');

  // Insert product types
  const now = new Date();
  for (const typeData of PRODUCT_TYPES) {
    try {
      const existing = await ProductTypeModel.findOne({ code: typeData.code });
      if (existing) {
        console.log(`  ⊘ Skipping "${typeData.code}" (already exists)`);
        continue;
      }

      const productType = new ProductTypeModel({
        ...typeData,
        createdBy: systemUserId,
        updatedBy: systemUserId,
        createdAt: now,
        updatedAt: now,
      });

      await productType.save();
      stats.inserted++;
      console.log(`  ✓ Created "${typeData.code}"`);
    } catch (err: any) {
      stats.errors++;
      console.error(`  ✗ Error creating "${typeData.code}":`, err.message);
    }
  }

  console.log(`\n✓ Product Types Seeding Complete`);
  console.log(`  Inserted: ${stats.inserted}`);
  console.log(`  Errors: ${stats.errors}`);

  return stats;
}

/**
 * Main execution
 */
async function main() {
  const opts = parseArgs();

  try {
    await connectToDatabase();
    await seedProductTypes(opts);
    await connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Seeding failed:', err);
    await connection.close();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
