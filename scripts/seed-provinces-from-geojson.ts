// Ensure path aliases from tsconfig are registered when running via ts-node
import 'tsconfig-paths/register';

import { connect, connection } from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
import area from '@turf/area';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';

import { ProvinceSchema } from '../libs/shared/schemas/province.schema';
import { GeometrySource } from '../libs/shared/types/geometry.types';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
require('dotenv').config();

/**
 * Seed provinces from a GeoJSON FeatureCollection file.
 *
 * Usage:
 *   ts-node scripts/seed-provinces-from-geojson.ts --file "scripts/data/Việt Nam (tỉnh thành) - 34.geojson" [--drop] [--source gov]
 */

interface Options {
  file?: string;
  drop?: boolean;
  source?: string;
}

function parseArgs(): Options {
  const opts: Options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) {
      opts.file = args[i + 1];
      i++;
    } else if (a === '--drop') {
      opts.drop = true;
    } else if (a === '--source' && args[i + 1]) {
      opts.source = args[i + 1];
      i++;
    }
  }
  return opts;
}

async function seedFromGeoJSON() {
  const opts = parseArgs();
  const defaultFile = path.resolve(__dirname, 'data', 'Việt Nam (tỉnh thành) - 34.geojson');
  const filePath = opts.file ? path.resolve(process.cwd(), opts.file) : defaultFile;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/open-erp';
  const geomSource = (opts.source as any) || GeometrySource.GOV;

  console.log('Reading geojson from', filePath);
  const raw = await fs.readFile(filePath, { encoding: 'utf8' });
  let parsed: FeatureCollection | null = null;
  try {
    parsed = JSON.parse(raw) as FeatureCollection;
  } catch (err) {
    console.error('Failed to parse GeoJSON file:', err);
    process.exit(1);
  }

  if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    console.error('Provided file is not a FeatureCollection');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');

  // Use shared database config so credentials (MONGODB_USER/MONGODB_PASS) are respected
  const dbConfig = getDatabaseConfig();
  const mongooseOpts = getMongooseOptions(dbConfig) as any;
  const connectUri = dbConfig.uri || mongoUri;

  // Mask password for logging
  const maskedAuth = dbConfig.user ? `${dbConfig.user}:***` : '(no-auth)';
  console.log(`DB config -> uri: ${connectUri}, dbName: ${mongooseOpts.dbName}, auth: ${maskedAuth}`);

  // Helper to perform connect with options
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
    console.log('Connected to MongoDB');
  } catch (err: any) {
    console.error('Initial connection failed:', err && err.message ? err.message : err);

    // If auth failed and we have credentials, try embedding credentials into the URI as a fallback
    if (dbConfig.user && (dbConfig.pass || (process.env.MONGODB_PASSWORD as string))) {
      const user = encodeURIComponent(dbConfig.user);
      const pass = encodeURIComponent(dbConfig.pass || (process.env.MONGODB_PASSWORD as string));
      // Insert credentials after protocol
      const credentialedUri = connectUri.replace(/^(mongodb(\+srv)?:\/\/)/, `$1${user}:${pass}@`);
      console.log('Retrying with credentials embedded in URI (password masked)');
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
        console.log('Connected to MongoDB with embedded credentials');
      } catch (err2: any) {
        console.error('Retry with embedded credentials failed:', err2 && err2.message ? err2.message : err2);
        throw err2;
      }
    } else {
      // No credentials to retry with, rethrow original error
      throw err;
    }
  }

  const Province = connection.model('Province', ProvinceSchema);

  try {
    if (opts.drop) {
      console.log('Dropping existing provinces collection...');
      await Province.deleteMany({});
    }

    let upserted = 0;
    let skipped = 0;

    for (const feat of parsed.features as Feature[]) {
      const props: any = (feat.properties || {}) as GeoJsonProperties;

      // Try common property names used in Vietnamese datasets
      const code = String(props.ma_tinh ?? props.code ?? props.id ?? props.Ma ?? props['GID_1'] ?? '').trim();
      const name = String(props.ten_tinh ?? props.TEN_TINH ?? props.name ?? props.NAME ?? '').trim();

      if (!code || !name) {
        console.warn('Skipping feature with missing code/name:', props);
        skipped++;
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
          if (c && c.geometry && Array.isArray((c.geometry as any).coordinates)) {
            const [lon, lat] = (c.geometry as any).coordinates as [number, number];
            ctr = { lat, lon };
          }
          const a = area(feat); // in square meters
          areaSqKm = Math.round((a / 1_000_000) * 1e6) / 1e6; // km^2 rounded to micro precision
        }
      } catch (err) {
        console.warn(`Failed to compute geometry metrics for ${code}:`, err);
      }

      const updateDoc: any = {
        code,
        name,
        version: '1.0',
        isLegacy: false,
        geometry: geom || undefined,
        centroid: ctr || undefined,
        bbox: bb || undefined,
        areaSqKm: areaSqKm || undefined,
        geometrySource: geom ? geomSource : undefined,
        geometryVersion: geom ? 1 : undefined,
        geometryUpdatedAt: geom ? new Date() : undefined,
        geometryUpdatedBy: geom ? 'seed-provinces-from-geojson' : undefined,
      };

      const res = await Province.updateOne({ code }, { $set: updateDoc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
      if (res.upsertedCount || res.matchedCount) upserted++;
    }

    console.log(`Done. Upserted/updated ${upserted} provinces, skipped ${skipped} features.`);
  } catch (err) {
    console.error('Error during seeding:', err);
    throw err;
  } finally {
    await connection.close();
    console.log('Database connection closed');
  }
}

if (require.main === module) {
  seedFromGeoJSON()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

export { seedFromGeoJSON };
