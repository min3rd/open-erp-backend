#!/usr/bin/env ts-node

/**
 * Seed wards from a GeoJSON FeatureCollection file
 * 
 * Usage:
 *   ts-node scripts/seeds/seed-wards.ts [options]
 * 
 * Options:
 *   --file <path>       Path to GeoJSON file (default: scripts/data/Việt Nam (phường xã) - 34.geojson)
 *   --drop              Drop existing wards before seeding
 *   --dry-run           Validate without writing to database
 *   --source <name>     Geometry source identifier (default: gov)
 *   --limit <n>         Limit number of features to process
 *   --skip <n>          Skip first n features
 */

import 'tsconfig-paths/register';
import { connect, connection } from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
import area from '@turf/area';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';

import { WardSchema } from '@shared/schemas/ward.schema';
import { GeometrySource } from '@shared/types/geometry.types';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

require('dotenv').config();

interface SeedOptions {
  file?: string;
  drop?: boolean;
  dryRun?: boolean;
  source?: string;
  limit?: number;
  skip?: number;
}

interface SeedStats {
  total: number;
  upserted: number;
  skipped: number;
  errors: number;
}

function parseArgs(): SeedOptions {
  const opts: SeedOptions = {};
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--file':
        if (args[i + 1]) {
          opts.file = args[i + 1];
          i++;
        }
        break;
      case '--drop':
        opts.drop = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--source':
        if (args[i + 1]) {
          opts.source = args[i + 1];
          i++;
        }
        break;
      case '--limit':
        if (args[i + 1]) {
          opts.limit = parseInt(args[i + 1], 10);
          i++;
        }
        break;
      case '--skip':
        if (args[i + 1]) {
          opts.skip = parseInt(args[i + 1], 10);
          i++;
        }
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

/**
 * Seed wards from GeoJSON file
 */
export async function seedWardsFromGeoJSON(options: SeedOptions = {}): Promise<SeedStats> {
  const opts = { ...parseArgs(), ...options };
  
  const defaultFile = path.resolve(__dirname, '..', 'data', 'Việt Nam (phường xã) - 34.geojson');
  const filePath = opts.file ? path.resolve(process.cwd(), opts.file) : defaultFile;
  const geomSource = (opts.source as any) || GeometrySource.GOV;

  console.log(`Reading GeoJSON from: ${filePath}`);
  
  const stats: SeedStats = {
    total: 0,
    upserted: 0,
    skipped: 0,
    errors: 0,
  };

  // Read and parse GeoJSON file
  const raw = await fs.readFile(filePath, { encoding: 'utf8' });
  let parsed: FeatureCollection | null = null;
  
  try {
    parsed = JSON.parse(raw) as FeatureCollection;
  } catch (err) {
    console.error('Failed to parse GeoJSON file:', err);
    throw new Error('Invalid GeoJSON file');
  }

  if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('Provided file is not a valid FeatureCollection');
  }

  console.log(`Found ${parsed.features.length} features in GeoJSON`);
  
  if (opts.dryRun) {
    console.log('DRY RUN MODE - No database changes will be made');
  }

  // Connect to database
  if (!opts.dryRun) {
    await connectToDatabase();
  }

  const Ward = connection.model('Ward', WardSchema);

  try {
    // Drop existing data if requested
    if (opts.drop && !opts.dryRun) {
      console.log('Dropping existing wards collection...');
      await Ward.deleteMany({});
      console.log('✓ Collection dropped');
    }

    // Process features
    const featuresToProcess = parsed.features
      .slice(opts.skip || 0, opts.limit ? (opts.skip || 0) + opts.limit : undefined);
    
    stats.total = featuresToProcess.length;
    console.log(`Processing ${stats.total} features...`);

    for (const feat of featuresToProcess as Feature[]) {
      const props: any = (feat.properties || {}) as GeoJsonProperties;

      // Extract ward code, name, and province linkage from various property names
      const code = String(
        props.ma_phuong ?? props.ma_xa ?? props.code ?? props.id ?? 
        props.GID_2 ?? props.Ma ?? ''
      ).trim();
      
      const name = String(
        props.ten_phuong ?? props.ten_xa ?? props.name ?? props.NAME ?? props['NAME_2'] ?? ''
      ).trim();
      
      const provinceCode = String(
        props.ma_tinh ?? props.provinceCode ?? props.province_code ?? 
        props.province ?? props['GID_1'] ?? ''
      ).trim();

      if (!code || !name || !provinceCode) {
        console.warn('⚠ Skipping feature with missing code/name/provinceCode:', props);
        stats.skipped++;
        continue;
      }

      const geom = feat.geometry ?? null;

      // Compute bbox, centroid, area where possible
      let bb: number[] | undefined;
      let ctr: { lat: number; lon: number } | undefined;
      let areaSqKm: number | undefined;

      try {
        if (geom) {
          bb = bbox(feat);
          const c = centroid(feat);
          if (c?.geometry && Array.isArray((c.geometry as any).coordinates)) {
            const [lon, lat] = (c.geometry as any).coordinates as [number, number];
            ctr = { lat, lon };
          }
          const a = area(feat); // in square meters
          areaSqKm = Math.round((a / 1_000_000) * 1e6) / 1e6; // km^2 rounded
        }
      } catch (err) {
        console.warn(`⚠ Failed to compute geometry metrics for ward ${code}:`, err);
      }

      const updateDoc: any = {
        code,
        name,
        provinceCode,
        version: '1.0',
        isLegacy: false,
        geometry: geom || undefined,
        centroid: ctr || undefined,
        bbox: bb || undefined,
        areaSqKm: areaSqKm || undefined,
        geometrySource: geom ? geomSource : undefined,
        geometryVersion: geom ? 1 : undefined,
        geometryUpdatedAt: geom ? new Date() : undefined,
        geometryUpdatedBy: geom ? 'seed-wards' : undefined,
      };

      if (opts.dryRun) {
        console.log(`[DRY RUN] Would upsert ward: ${code} - ${name} (Province: ${provinceCode})`);
        stats.upserted++;
      } else {
        try {
          const res = await Ward.updateOne(
            { code, provinceCode },
            { $set: updateDoc, $setOnInsert: { createdAt: new Date() } },
            { upsert: true }
          );
          
          if (res.upsertedCount || res.matchedCount) {
            stats.upserted++;
          }
        } catch (err) {
          console.error(`✗ Error upserting ward ${code}:`, err);
          stats.errors++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('WARDS SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total features: ${stats.total}`);
    console.log(`Upserted: ${stats.upserted}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error during seeding:', err);
    throw err;
  } finally {
    if (!opts.dryRun && connection.readyState === 1) {
      await connection.close();
      console.log('Database connection closed');
    }
  }

  return stats;
}

// Run as standalone script
if (require.main === module) {
  seedWardsFromGeoJSON()
    .then((stats) => {
      console.log('\n✓ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Seeding failed:', err);
      process.exit(1);
    });
}
