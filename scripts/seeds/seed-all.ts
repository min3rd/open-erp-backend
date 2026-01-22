#!/usr/bin/env ts-node

/**
 * Master seed script to run all database seed operations
 * 
 * Usage:
 *   ts-node scripts/seeds/seed-all.ts [options]
 * 
 * Options:
 *   --drop              Drop existing data before seeding (requires --confirm)
 *   --confirm           Confirm destructive operations
 *   --dry-run           Validate without writing to database
 *   --skip-provinces    Skip provinces seeding
 *   --skip-wards        Skip wards seeding
 *   --skip-warehouse-types  Skip warehouse types seeding
 *   --skip-warehouses   Skip warehouses seeding
 *   --warehouse-count   Number of sample warehouses to create (default: 20)
 */

import 'tsconfig-paths/register';
import { seedProvincesFromGeoJSON } from './seed-provinces';
import { seedWardsFromGeoJSON } from './seed-wards';
import { seedWarehouseTypes } from './seed-warehouse-types';
import { seedWarehouses } from './seed-warehouses';

require('dotenv').config();

interface Options {
  drop?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
  skipProvinces?: boolean;
  skipWards?: boolean;
  skipWarehouseTypes?: boolean;
  skipWarehouses?: boolean;
  warehouseCount?: number;
}

function parseArgs(): Options {
  const opts: Options = {};
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--drop':
        opts.drop = true;
        break;
      case '--confirm':
        opts.confirm = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--skip-provinces':
        opts.skipProvinces = true;
        break;
      case '--skip-wards':
        opts.skipWards = true;
        break;
      case '--skip-warehouse-types':
        opts.skipWarehouseTypes = true;
        break;
      case '--skip-warehouses':
        opts.skipWarehouses = true;
        break;
      case '--warehouse-count':
        if (args[i + 1]) {
          opts.warehouseCount = parseInt(args[i + 1], 10);
          i++;
        }
        break;
    }
  }
  
  return opts;
}

async function seedAll() {
  const opts = parseArgs();
  
  // Validate destructive operations
  if (opts.drop && !opts.confirm) {
    console.error('ERROR: --drop requires --confirm flag for safety');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('DATABASE SEED - ALL OPERATIONS');
  console.log('='.repeat(60));
  console.log('');
  console.log('Options:');
  console.log(`  Drop existing data: ${opts.drop ? 'YES' : 'NO'}`);
  console.log(`  Dry run: ${opts.dryRun ? 'YES' : 'NO'}`);
  console.log(`  Warehouse count: ${opts.warehouseCount || 20}`);
  console.log('');
  
  const results: { name: string; success: boolean; error?: string; stats?: any }[] = [];
  
  // 1. Seed Provinces
  if (!opts.skipProvinces) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 1: Seeding Provinces from GeoJSON');
    console.log('='.repeat(60));
    try {
      const stats = await seedProvincesFromGeoJSON({
        drop: opts.drop,
        dryRun: opts.dryRun,
      });
      results.push({ name: 'Provinces', success: true, stats });
      console.log('✓ Provinces seeding completed successfully');
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      results.push({ name: 'Provinces', success: false, error: errorMsg });
      console.error('✗ Provinces seeding failed:', errorMsg);
      if (!opts.dryRun) {
        throw err; // Stop on error unless dry-run
      }
    }
  } else {
    console.log('\nSkipping provinces seeding');
  }
  
  // 2. Seed Wards
  if (!opts.skipWards) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Seeding Wards from GeoJSON');
    console.log('='.repeat(60));
    try {
      const stats = await seedWardsFromGeoJSON({
        drop: opts.drop,
        dryRun: opts.dryRun,
      });
      results.push({ name: 'Wards', success: true, stats });
      console.log('✓ Wards seeding completed successfully');
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      results.push({ name: 'Wards', success: false, error: errorMsg });
      console.error('✗ Wards seeding failed:', errorMsg);
      if (!opts.dryRun) {
        throw err;
      }
    }
  } else {
    console.log('\nSkipping wards seeding');
  }
  
  // 3. Seed Warehouse Types
  if (!opts.skipWarehouseTypes) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Seeding Warehouse Types');
    console.log('='.repeat(60));
    try {
      const stats = await seedWarehouseTypes({
        drop: opts.drop,
        dryRun: opts.dryRun,
      });
      results.push({ name: 'Warehouse Types', success: true, stats });
      console.log('✓ Warehouse types seeding completed successfully');
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      results.push({ name: 'Warehouse Types', success: false, error: errorMsg });
      console.error('✗ Warehouse types seeding failed:', errorMsg);
      if (!opts.dryRun) {
        throw err;
      }
    }
  } else {
    console.log('\nSkipping warehouse types seeding');
  }
  
  // 4. Seed Sample Warehouses
  if (!opts.skipWarehouses) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Seeding Sample Warehouses');
    console.log('='.repeat(60));
    try {
      const stats = await seedWarehouses({
        drop: opts.drop,
        dryRun: opts.dryRun,
        count: opts.warehouseCount || 20,
      });
      results.push({ name: 'Warehouses', success: true, stats });
      console.log('✓ Warehouses seeding completed successfully');
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      results.push({ name: 'Warehouses', success: false, error: errorMsg });
      console.error('✗ Warehouses seeding failed:', errorMsg);
      if (!opts.dryRun) {
        throw err;
      }
    }
  } else {
    console.log('\nSkipping warehouses seeding');
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach((result) => {
    const status = result.success ? '✓' : '✗';
    console.log(`${status} ${result.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.stats) {
      console.log(`  Stats:`, JSON.stringify(result.stats, null, 2));
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log('');
  console.log(`Total: ${results.length} operations`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('='.repeat(60));
  
  if (failCount > 0 && !opts.dryRun) {
    process.exit(1);
  }
}

if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('\n✓ All seeding operations completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Seeding failed:', err);
      process.exit(1);
    });
}

export { seedAll };
