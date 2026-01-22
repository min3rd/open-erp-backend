#!/usr/bin/env ts-node

/**
 * Seed sample warehouses with realistic data
 *
 * Usage:
 *   ts-node scripts/seeds/seed-warehouses.ts [options]
 *
 * Options:
 *   --count <n>         Number of warehouses to create (default: 20)
 *   --drop              Drop existing warehouses before seeding
 *   --dry-run           Validate without writing to database
 */

import 'tsconfig-paths/register';
import { connect, connection } from 'mongoose';
import { WarehouseSchema } from '@shared/schemas/warehouse.schema';
import { ProvinceSchema } from '@shared/schemas/province.schema';
import { WardSchema } from '@shared/schemas/ward.schema';
import {
  WarehouseType,
  WarehouseStatus,
  CapacityUnit,
  Region,
} from '@shared/constants/warehouse.constants';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

require('dotenv').config();

interface SeedOptions {
  count?: number;
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
      case '--count':
        if (args[i + 1]) {
          opts.count = parseInt(args[i + 1], 10);
          i++;
        }
        break;
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
      const credentialedUri = connectUri.replace(
        /^(mongodb(\+srv)?:\/\/)/,
        `$1${user}:${pass}@`,
      );

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
        console.error(
          'Retry with embedded credentials failed:',
          err2?.message || err2,
        );
        throw err2;
      }
    } else {
      throw err;
    }
  }
}

// Sample warehouse names
const warehouseNames = [
  'Kho Trung tâm Miền Bắc',
  'Kho Logistics Hà Nội',
  'Kho Phân phối HCM',
  'Kho Cảng Sài Gòn',
  'Kho Hải Phòng',
  'Kho Đà Nẵng',
  'Kho Dược phẩm An Giang',
  'Kho Lạnh Đồng Nai',
  'Kho Điện tử Bình Dương',
  'Kho Hải quan Quảng Ninh',
  'Kho Thực phẩm Cần Thơ',
  'Kho Dệt may Nam Định',
  'Kho Tổng hợp Nghệ An',
  'Kho Ngoại quan Vũng Tàu',
  'Kho Cross-dock Bắc Ninh',
];

/**
 * Generate a random warehouse code
 */
function generateWarehouseCode(index: number): string {
  const prefix = 'WH';
  const year = new Date().getFullYear();
  const num = String(index + 1).padStart(4, '0');
  return `${prefix}${year}${num}`;
}

/**
 * Generate sample warehouse data
 */
function generateWarehouseData(
  index: number,
  province: any,
  ward: any,
  allTypes: string[],
): any {
  const warehouseName =
    warehouseNames[index % warehouseNames.length] || `Kho Mẫu ${index + 1}`;
  const warehouseType = allTypes[index % allTypes.length];

  // Generate location near province centroid (with some random offset)
  const lat = province.centroid?.lat || 21.0285; // Default to Hanoi
  const lon = province.centroid?.lon || 105.8542;

  // Random offset within ~50km
  const latOffset = (Math.random() - 0.5) * 0.5;
  const lonOffset = (Math.random() - 0.5) * 0.5;

  const location = {
    type: 'Point',
    coordinates: [lon + lonOffset, lat + latOffset],
  };

  return {
    code: generateWarehouseCode(index),
    name: `${warehouseName} ${index + 1}`,
    type: warehouseType,
    status: WarehouseStatus.ACTIVE,
    addressDetail: `${Math.floor(Math.random() * 500) + 1} Đường ${['Nguyễn Trãi', 'Lê Lợi', 'Trần Hưng Đạo', 'Hai Bà Trưng'][index % 4]}`,
    ward: {
      code: ward.code,
      name: ward.name,
      provinceCode: ward.provinceCode,
    },
    province: {
      code: province.code,
      name: province.name,
    },
    region: province.region || Region.NORTHERN,
    location,
    totalAreaM2: Math.floor(Math.random() * 9000) + 1000, // 1000-10000 m²
    usableAreaM2: Math.floor(Math.random() * 7000) + 800,
    storageCapacity: Math.floor(Math.random() * 5000) + 500,
    capacityUnit: [CapacityUnit.TON, CapacityUnit.PALLET, CapacityUnit.M3][
      index % 3
    ],
    zonesCount: Math.floor(Math.random() * 10) + 2,
    racksCount: Math.floor(Math.random() * 100) + 20,
    floorsCount: Math.floor(Math.random() * 3) + 1,
    contact: {
      phone: `+84${Math.floor(Math.random() * 1000000000)}`,
      email: `warehouse${index + 1}@example.com`,
    },
  };
}

/**
 * Seed sample warehouses
 */
export async function seedWarehouses(
  options: SeedOptions = {},
): Promise<SeedStats> {
  const opts = { ...parseArgs(), ...options };
  const count = opts.count || 20;

  const stats: SeedStats = {
    total: count,
    inserted: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    console.log('DRY RUN MODE - No database changes will be made');
    console.log(`Would create ${count} sample warehouses`);
    stats.inserted = count;
    return stats;
  }

  // Connect to database
  await connectToDatabase();

  const Warehouse = connection.model('Warehouse', WarehouseSchema);
  const Province = connection.model('Province', ProvinceSchema);
  const Ward = connection.model('Ward', WardSchema);

  try {
    // Drop existing data if requested
    if (opts.drop) {
      console.log('Dropping existing warehouses...');
      await Warehouse.deleteMany({});
      console.log('✓ Collection dropped');
    }

    // Fetch provinces and wards
    console.log('Fetching provinces and wards...');
    const provinces = await Province.find({ isLegacy: false }).limit(10).lean();
    const wards = await Ward.find({ isLegacy: false }).limit(50).lean();

    if (provinces.length === 0) {
      throw new Error('No provinces found. Please run seed-provinces first.');
    }

    if (wards.length === 0) {
      throw new Error('No wards found. Please run seed-wards first.');
    }

    console.log(
      `Found ${provinces.length} provinces and ${wards.length} wards`,
    );

    // Get all warehouse types
    const allTypes = Object.values(WarehouseType);

    // Generate and insert warehouses
    console.log(`Generating ${count} sample warehouses...`);
    const warehousesData: any[] = [];

    for (let i = 0; i < count; i++) {
      const province = provinces[i % provinces.length];
      const ward = wards[i % wards.length];

      const warehouseData = generateWarehouseData(i, province, ward, allTypes);
      warehousesData.push(warehouseData);
    }

    console.log('Upserting warehouses...');
    let insertedCount = 0;
    for (const warehouseData of warehousesData) {
      try {
        await Warehouse.updateOne(
          { code: warehouseData.code },
          { $set: warehouseData },
          { upsert: true },
        );
        insertedCount++;
      } catch (err) {
        console.error(`Error upserting warehouse ${warehouseData.code}:`, err);
        stats.errors++;
      }
    }
    stats.inserted = insertedCount;

    console.log('\n' + '='.repeat(60));
    console.log('WAREHOUSES SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total warehouses: ${stats.total}`);
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(60));
  } catch (err) {
    console.error('Error seeding warehouses:', err);
    stats.errors++;
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
  seedWarehouses()
    .then((stats) => {
      console.log('\n✓ Warehouses seeding completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Warehouses seeding failed:', err);
      process.exit(1);
    });
}
