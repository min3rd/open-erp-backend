#!/usr/bin/env ts-node

/**
 * Seed warehouse types (master data)
 * 
 * Usage:
 *   ts-node scripts/seeds/seed-warehouse-types.ts [options]
 * 
 * Options:
 *   --drop              Drop existing warehouse types before seeding
 *   --dry-run           Validate without writing to database
 */

import 'tsconfig-paths/register';
import { connect, connection } from 'mongoose';
import { WarehouseTypeSchema } from '@shared/schemas/warehouse-type.schema';
import { WarehouseType } from '@shared/constants/warehouse.constants';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

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
 * Connect to MongoDB with proper authentication handling
 */
async function connectToDatabase(): Promise<void> {
  const dbConfig = getDatabaseConfig();
  const mongooseOpts = getMongooseOptions(dbConfig) as any;
  const connectUri = dbConfig.uri;

  const maskedAuth = dbConfig.user ? `${dbConfig.user}:***` : '(no-auth)';
  console.log(`Connecting to MongoDB...`);
  console.log(`  URI: ${connectUri}`);
  console.log(`  Database: ${mongooseOpts.dbName}`);
  console.log(`  Auth: ${maskedAuth}`);

  async function doConnect(uri: string, opts: any) {
    return await connect(uri, opts);
  }

  try {
    await doConnect(connectUri, {
      dbName: mongooseOpts.dbName,
      auth: mongooseOpts.auth,
      authSource: mongooseOpts.authSource,
      maxPoolSize: mongooseOpts.maxPoolSize,
      minPoolSize: mongooseOpts.minPoolSize,
      serverSelectionTimeoutMS: mongooseOpts.serverSelectionTimeoutMS,
      connectTimeoutMS: mongooseOpts.connectTimeoutMS,
      socketTimeoutMS: mongooseOpts.socketTimeoutMS,
      tls: mongooseOpts.tls,
      tlsAllowInvalidCertificates: mongooseOpts.tlsAllowInvalidCertificates,
      replicaSet: mongooseOpts.replicaSet,
    });
    console.log('✓ Connected to MongoDB');
  } catch (err: any) {
    console.error('Initial connection failed:', err?.message || err);

    // Fallback: try embedding credentials in URI
    if (dbConfig.user && dbConfig.pass) {
      const user = encodeURIComponent(dbConfig.user);
      const pass = encodeURIComponent(dbConfig.pass);
      const credentialedUri = connectUri.replace(/^(mongodb(\+srv)?:\/\/)/, `$1${user}:${pass}@`);
      
      console.log('Retrying with credentials embedded in URI...');
      try {
        await doConnect(credentialedUri, {
          dbName: mongooseOpts.dbName,
          maxPoolSize: mongooseOpts.maxPoolSize,
          minPoolSize: mongooseOpts.minPoolSize,
          serverSelectionTimeoutMS: mongooseOpts.serverSelectionTimeoutMS,
          connectTimeoutMS: mongooseOpts.connectTimeoutMS,
          socketTimeoutMS: mongooseOpts.socketTimeoutMS,
          tls: mongooseOpts.tls,
          tlsAllowInvalidCertificates: mongooseOpts.tlsAllowInvalidCertificates,
          replicaSet: mongooseOpts.replicaSet,
        });
        console.log('✓ Connected to MongoDB with embedded credentials');
      } catch (err2: any) {
        console.error('Retry with embedded credentials failed:', err2?.message || err2);
        throw err2;
      }
    } else {
      throw err;
    }
  }
}

// Warehouse types master data
const warehouseTypesData = [
  {
    code: WarehouseType.GENERAL,
    name: 'Kho tổng hợp',
    nameEn: 'General Warehouse',
    description: 'Kho lưu trữ hàng hóa tổng hợp, đa mục đích',
    isActive: true,
    sortOrder: 1,
  },
  {
    code: WarehouseType.COLD_STORAGE,
    name: 'Kho lạnh',
    nameEn: 'Cold Storage',
    description: 'Kho bảo quản hàng hóa ở nhiệt độ thấp',
    isActive: true,
    sortOrder: 2,
  },
  {
    code: WarehouseType.BONDED,
    name: 'Kho ngoại quan',
    nameEn: 'Bonded Warehouse',
    description: 'Kho hàng ngoại quan, tạm nhập tái xuất',
    isActive: true,
    sortOrder: 3,
  },
  {
    code: WarehouseType.DISTRIBUTION_CENTER,
    name: 'Trung tâm phân phối',
    nameEn: 'Distribution Center',
    description: 'Trung tâm phân phối hàng hóa',
    isActive: true,
    sortOrder: 4,
  },
  {
    code: WarehouseType.CROSS_DOCK,
    name: 'Kho cross-dock',
    nameEn: 'Cross-dock Warehouse',
    description: 'Kho chuyển hàng trực tiếp, không lưu trữ lâu dài',
    isActive: true,
    sortOrder: 5,
  },
  {
    code: WarehouseType.AUTOMATED,
    name: 'Kho tự động',
    nameEn: 'Automated Warehouse',
    description: 'Kho có hệ thống tự động hóa cao',
    isActive: true,
    sortOrder: 6,
  },
  {
    code: WarehouseType.HAZMAT,
    name: 'Kho hàng nguy hiểm',
    nameEn: 'Hazardous Materials Warehouse',
    description: 'Kho lưu trữ hàng nguy hiểm, hóa chất',
    isActive: true,
    sortOrder: 7,
  },
  {
    code: WarehouseType.PHARMACEUTICAL,
    name: 'Kho dược phẩm',
    nameEn: 'Pharmaceutical Warehouse',
    description: 'Kho lưu trữ dược phẩm, y tế',
    isActive: true,
    sortOrder: 8,
  },
  {
    code: WarehouseType.FOOD_GRADE,
    name: 'Kho thực phẩm',
    nameEn: 'Food Grade Warehouse',
    description: 'Kho lưu trữ thực phẩm đạt tiêu chuẩn an toàn',
    isActive: true,
    sortOrder: 9,
  },
  {
    code: WarehouseType.TEXTILE,
    name: 'Kho dệt may',
    nameEn: 'Textile Warehouse',
    description: 'Kho lưu trữ hàng dệt may',
    isActive: true,
    sortOrder: 10,
  },
  {
    code: WarehouseType.ELECTRONICS,
    name: 'Kho điện tử',
    nameEn: 'Electronics Warehouse',
    description: 'Kho lưu trữ thiết bị điện tử',
    isActive: true,
    sortOrder: 11,
  },
  {
    code: WarehouseType.CUSTOMS,
    name: 'Kho hải quan',
    nameEn: 'Customs Warehouse',
    description: 'Kho hải quan, kiểm soát hàng xuất nhập khẩu',
    isActive: true,
    sortOrder: 12,
  },
];

/**
 * Seed warehouse types
 */
export async function seedWarehouseTypes(options: SeedOptions = {}): Promise<SeedStats> {
  const opts = { ...parseArgs(), ...options };
  
  const stats: SeedStats = {
    total: warehouseTypesData.length,
    inserted: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    console.log('DRY RUN MODE - No database changes will be made');
    console.log(`Would insert ${stats.total} warehouse types`);
    stats.inserted = stats.total;
    return stats;
  }

  // Connect to database
  await connectToDatabase();

  const WarehouseTypeMaster = connection.model('WarehouseTypeMaster', WarehouseTypeSchema);

  try {
    // Drop existing data if requested
    if (opts.drop) {
      console.log('Dropping existing warehouse types...');
      await WarehouseTypeMaster.deleteMany({});
      console.log('✓ Collection dropped');
    }

    // Insert warehouse types
    console.log('Inserting warehouse types...');
    const inserted = await WarehouseTypeMaster.insertMany(warehouseTypesData);
    stats.inserted = inserted.length;

    console.log('\n' + '='.repeat(60));
    console.log('WAREHOUSE TYPES SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total types: ${stats.total}`);
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error seeding warehouse types:', err);
    throw err;
  } finally {
    if (connection.readyState === 1) {
      await connection.close();
      console.log('Database connection closed');
    }
  }

  return stats;
}

// Run as standalone script
if (require.main === module) {
  seedWarehouseTypes()
    .then((stats) => {
      console.log('\n✓ Warehouse types seeding completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Warehouse types seeding failed:', err);
      process.exit(1);
    });
}

export { warehouseTypesData };
