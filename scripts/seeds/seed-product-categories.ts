#!/usr/bin/env ts-node

/**
 * Seed product categories (master data)
 *
 * Usage:
 *   ts-node scripts/seeds/seed-product-categories.ts [options]
 *
 * Options:
 *   --drop              Drop existing product categories before seeding
 *   --dry-run           Validate without writing to database
 */

import 'tsconfig-paths/register';
import { connect, connection, Model } from 'mongoose';
import { ProductCategory, ProductCategorySchema } from '@shared/schemas';
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
 * Sample product categories with hierarchical structure
 */
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
  {
    code: 'agriculture',
    name: 'Agriculture',
    description: 'Agricultural products and supplies',
    parentId: null,
    order: 5,
    isActive: true,
  },
  {
    code: 'healthcare',
    name: 'Healthcare',
    description: 'Healthcare and medical products',
    parentId: null,
    order: 6,
    isActive: true,
  },
];

/**
 * Seed product categories
 */
export async function seedProductCategories(
  opts: SeedOptions = {},
): Promise<SeedStats> {
  const stats: SeedStats = {
    total: SAMPLE_CATEGORIES.length,
    inserted: 0,
    errors: 0,
  };

  console.log('\n📂 Seeding Product Categories...');
  console.log(`  Total categories to seed: ${stats.total}`);
  console.log(`  Options:`, opts);

  if (opts.dryRun) {
    console.log('  DRY RUN MODE - No changes will be made\n');
    return stats;
  }

  const ProductCategoryModel: Model<ProductCategory> = connection.model(
    'ProductCategory',
    ProductCategorySchema,
  );

  // Drop existing data if requested
  if (opts.drop) {
    console.log('  Dropping existing product categories...');
    await ProductCategoryModel.deleteMany({});
    console.log('  ✓ Dropped existing product categories');
  }

  // Get system user ID or use placeholder
  const systemUserId = new ObjectId('000000000000000000000000');

  // Insert product categories
  const now = new Date();
  for (const categoryData of SAMPLE_CATEGORIES) {
    try {
      const existing = await ProductCategoryModel.findOne({
        code: categoryData.code,
      });
      if (existing) {
        console.log(`  ⊘ Skipping "${categoryData.code}" (already exists)`);
        continue;
      }

      const categoryId = new ObjectId();
      const category = new ProductCategoryModel({
        _id: categoryId,
        ...categoryData,
        path: `/${categoryId}/`,
        level: 0,
        createdBy: systemUserId,
        updatedBy: systemUserId,
        createdAt: now,
        updatedAt: now,
      });

      await category.save();
      stats.inserted++;
      console.log(`  ✓ Created "${categoryData.code}"`);
    } catch (err: any) {
      stats.errors++;
      console.error(
        `  ✗ Error creating "${categoryData.code}":`,
        err.message,
      );
    }
  }

  console.log(`\n✓ Product Categories Seeding Complete`);
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
    await seedProductCategories(opts);
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
