#!/usr/bin/env ts-node

/**
 * Seed navigation items from frontend routes or JSON manifest
 *
 * This script reads navigation data from the frontend repository (app.routes.ts)
 * or from a JSON manifest file and populates the navigation collection in the database.
 *
 * Features:
 * - Reads from frontend repo or JSON file
 * - Idempotent upsert by id or route
 * - Preserves parent-child hierarchy
 * - Generates i18n translation keys
 * - Supports dry-run mode
 * - Generates execution reports
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register scripts/seeds/seed-navigation.ts [options]
 *
 * Options:
 *   --source <fe|file>       Source of navigation data (default: file)
 *   --file <path>            Path to JSON manifest file
 *   --dry-run                Preview without writing to database
 *   --confirm                Confirm database writes
 *   --prefix <string>        Route prefix to prepend
 *   --skip-existing          Skip existing items (don't update)
 *   --export-i18n            Export i18n translation keys to JSON
 *   --push-api <url>         Use API endpoint instead of direct DB writes
 *   --drop                   Drop all navigation items before seeding
 */

import 'tsconfig-paths/register';
import { connect, connection, Model, Schema } from 'mongoose';
import { getDatabaseConfig } from '@shared/database';
import {
  parseArgs,
  validateDestructiveOps,
  printStats,
  saveReport,
  SeedOptions,
  SeedStats,
  SeedReport,
} from './utils/seed-utils';
import * as fs from 'fs';
import * as path from 'path';
import slugify from 'slugify';

require('dotenv').config();

// Navigation Schema Definition (from config-service)
interface Navigation {
  id: string;
  label: string;
  icon?: string;
  subtitle?: string;
  routerLink?: string;
  url?: string;
  permissions?: {
    include?: string[];
    exclude?: string[];
  };
  command?: string;
  items?: string[];
  disabled?: boolean;
  target?: string;
  badge?: string;
  tooltip?: string;
  shortcut?: string;
  class?: string;
  iconStyle?: string;
  iconClass?: string;
  labelStyle?: string;
  labelClass?: string;
  linkStyle?: string;
  linkClass?: string;
  order: number;
  scope: 'global' | 'module';
  moduleId?: string;
  parentId?: string;
  meta?: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NavigationSchema = new Schema<Navigation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    icon: String,
    subtitle: String,
    routerLink: String,
    url: String,
    permissions: {
      type: Object,
      default: undefined,
    },
    command: String,
    items: [String],
    disabled: { type: Boolean, default: false },
    target: String,
    badge: String,
    tooltip: String,
    shortcut: String,
    class: String,
    iconStyle: String,
    iconClass: String,
    labelStyle: String,
    labelClass: String,
    linkStyle: String,
    linkClass: String,
    order: { type: Number, default: 0 },
    scope: {
      type: String,
      required: true,
      enum: ['global', 'module'],
      default: 'global',
      index: true,
    },
    moduleId: { type: String, index: true },
    parentId: String,
    meta: Object,
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, collection: 'navigations' }
);

// Create indexes
NavigationSchema.index({ scope: 1, moduleId: 1, order: 1 });
NavigationSchema.index({ scope: 1, parentId: 1 });
NavigationSchema.index({ moduleId: 1, order: 1 });
NavigationSchema.index({ parentId: 1 });


// Extend SeedOptions with navigation-specific options
interface NavigationSeedOptions extends SeedOptions {
  source?: 'fe' | 'file';
  file?: string;
  prefix?: string;
  skipExisting?: boolean;
  exportI18n?: boolean;
  pushApi?: string;
}

interface ManifestNavigationItem {
  id?: string;
  label: string;
  labelKey?: string;
  route?: string | string[];
  routerLink?: string | string[];
  icon?: string;
  module?: string;
  scope?: 'global' | 'module';
  moduleId?: string;
  parentId?: string;
  order?: number;
  permissions?: {
    include?: string[];
    exclude?: string[];
  };
  meta?: Record<string, any>;
}

interface NavigationManifest {
  navigation: ManifestNavigationItem[];
}

/**
 * Parse navigation-specific CLI arguments
 */
function parseNavigationArgs(args: string[]): NavigationSeedOptions {
  const baseOpts = parseArgs(args);
  const navOpts: NavigationSeedOptions = { ...baseOpts };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source':
        if (args[i + 1]) {
          navOpts.source = args[i + 1] as 'fe' | 'file';
          i++;
        }
        break;
      case '--file':
        if (args[i + 1]) {
          navOpts.file = args[i + 1];
          i++;
        }
        break;
      case '--prefix':
        if (args[i + 1]) {
          navOpts.prefix = args[i + 1];
          i++;
        }
        break;
      case '--skip-existing':
        navOpts.skipExisting = true;
        break;
      case '--export-i18n':
        navOpts.exportI18n = true;
        break;
      case '--push-api':
        if (args[i + 1]) {
          navOpts.pushApi = args[i + 1];
          i++;
        }
        break;
    }
  }

  return navOpts;
}

/**
 * Generate slug from label
 */
function generateSlug(label: string): string {
  return slugify(label, {
    lower: true,
    strict: true,
    replacement: '-',
  });
}

/**
 * Generate navigation ID if not provided
 */
function generateNavigationId(item: ManifestNavigationItem, parentId?: string): string {
  if (item.id) {
    return item.id;
  }

  const slug = generateSlug(item.label);
  const prefix = parentId ? `${parentId}-` : 'nav-';
  return `${prefix}${slug}`;
}

/**
 * Generate Transloco key for navigation item
 */
function generateLabelKey(item: ManifestNavigationItem, generatedId: string): string {
  if (item.labelKey) {
    return item.labelKey;
  }

  // Remove 'nav-' prefix and convert dashes to dots
  const keyPath = generatedId.replace(/^nav-/, '').replace(/-/g, '.');
  return `navigation.${keyPath}`;
}

/**
 * Get route from manifest item
 */
function getRoute(item: ManifestNavigationItem, prefix?: string): string | undefined {
  let route = item.route || item.routerLink;
  
  if (!route) {
    return undefined;
  }

  // Handle array format
  if (Array.isArray(route)) {
    route = route.join('/');
  }

  // Ensure route starts with /
  if (!route.startsWith('/')) {
    route = `/${route}`;
  }

  // Apply prefix if provided
  if (prefix) {
    const cleanPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
    route = `${cleanPrefix}${route}`;
  }

  return route;
}

/**
 * Read navigation manifest from JSON file
 */
function readManifestFromFile(filePath: string): NavigationManifest {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Manifest file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const manifest = JSON.parse(content);

  if (!manifest.navigation || !Array.isArray(manifest.navigation)) {
    throw new Error('Invalid manifest format: missing "navigation" array');
  }

  return manifest;
}

/**
 * Read navigation data from frontend repository
 */
function readManifestFromFrontend(): NavigationManifest {
  // This would parse TypeScript route files from the frontend repo
  // For now, we'll use a default sample manifest
  const samplePath = path.join(__dirname, 'data', 'navigation-manifest-sample.json');
  
  if (!fs.existsSync(samplePath)) {
    throw new Error(
      'Frontend parsing not yet implemented. Please use --source=file with --file option'
    );
  }

  console.log(`Reading from sample manifest: ${samplePath}`);
  return readManifestFromFile(samplePath);
}

/**
 * Convert manifest item to navigation document
 */
function manifestItemToDocument(
  item: ManifestNavigationItem,
  options: NavigationSeedOptions
): any {
  const generatedId = generateNavigationId(item, item.parentId);
  const labelKey = generateLabelKey(item, generatedId);
  const route = getRoute(item, options.prefix);

  const doc: any = {
    id: generatedId,
    label: item.label,
    routerLink: route,
    scope: item.scope || 'global',
    order: item.order || 0,
    createdBy: 'script',
    updatedBy: 'script',
  };

  // Optional fields
  if (item.icon) doc.icon = item.icon;
  if (item.module) doc.moduleId = item.module;
  if (item.moduleId) doc.moduleId = item.moduleId;
  if (item.parentId) doc.parentId = item.parentId;
  if (item.permissions) doc.permissions = item.permissions;
  if (item.meta) doc.meta = item.meta;

  return doc;
}

/**
 * Validate navigation items
 */
function validateNavigationItems(items: ManifestNavigationItem[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const ids = new Set<string>();
  const routes = new Set<string>();

  items.forEach((item, index) => {
    const generatedId = generateNavigationId(item, item.parentId);
    const route = getRoute(item);

    // Check ID uniqueness
    if (ids.has(generatedId)) {
      errors.push(`Duplicate ID at index ${index}: ${generatedId}`);
    }
    ids.add(generatedId);

    // Check route uniqueness (if present)
    if (route) {
      if (routes.has(route)) {
        errors.push(`Duplicate route at index ${index}: ${route}`);
      }
      routes.add(route);
    }

    // Validate parent reference
    if (item.parentId && !ids.has(item.parentId)) {
      // Parent might come later, so we'll just warn
      console.warn(`Warning: Parent ${item.parentId} for item ${generatedId} not found yet`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export i18n translation keys
 */
function exportI18nKeys(items: ManifestNavigationItem[], options: NavigationSeedOptions): void {
  const translations: Record<string, string> = {};

  items.forEach((item) => {
    const generatedId = generateNavigationId(item, item.parentId);
    const labelKey = generateLabelKey(item, generatedId);
    translations[labelKey] = item.label;
  });

  const exportsDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `navigation-i18n-en-${timestamp}.json`;
  const filepath = path.join(exportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(translations, null, 2), 'utf-8');
  console.log(`✓ Exported i18n keys to: ${filepath}`);
}

/**
 * Main seed function
 */
async function seedNavigation(options: NavigationSeedOptions): Promise<SeedStats> {
  const stats: SeedStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  let NavigationModel: Model<Navigation> | null = null;

  try {
    // Read manifest
    console.log('Reading navigation manifest...');
    let manifest: NavigationManifest;

    if (options.source === 'fe') {
      manifest = readManifestFromFrontend();
    } else {
      const filePath = options.file || path.join(__dirname, 'data', 'navigation-manifest-sample.json');
      manifest = readManifestFromFile(filePath);
    }

    console.log(`✓ Found ${manifest.navigation.length} navigation items`);
    stats.total = manifest.navigation.length;

    // Validate items
    console.log('Validating navigation items...');
    const validation = validateNavigationItems(manifest.navigation);
    if (!validation.valid) {
      console.error('Validation errors:');
      validation.errors.forEach((err) => console.error(`  - ${err}`));
      throw new Error('Validation failed');
    }
    console.log('✓ Validation passed');

    // Export i18n if requested
    if (options.exportI18n) {
      console.log('Exporting i18n keys...');
      exportI18nKeys(manifest.navigation, options);
    }

    // Dry run - just print planned operations
    if (options.dryRun) {
      console.log('\n=== DRY RUN MODE - No database changes will be made ===\n');
      manifest.navigation.forEach((item, index) => {
        const doc = manifestItemToDocument(item, options);
        console.log(`[${index + 1}] ${doc.id}`);
        console.log(`    Label: ${doc.label}`);
        console.log(`    Route: ${doc.routerLink || 'N/A'}`);
        console.log(`    Scope: ${doc.scope}`);
        if (doc.parentId) console.log(`    Parent: ${doc.parentId}`);
        console.log('');
      });
      return stats;
    }

    // Connect to database
    if (!options.pushApi) {
      console.log('Connecting to database...');
      const dbConfig = getDatabaseConfig();
      await connect(dbConfig.uri);
      console.log('✓ Connected to database');

      NavigationModel = connection.model('Navigation', NavigationSchema);

      // Drop collection if requested
      if (options.drop) {
        console.log('Dropping navigation collection...');
        await NavigationModel.deleteMany({});
        console.log('✓ Collection dropped');
      }
    }

    // Process items
    console.log('Processing navigation items...');
    for (const item of manifest.navigation) {
      try {
        const doc = manifestItemToDocument(item, options);

        if (options.pushApi) {
          // TODO: Implement API push
          console.warn('API push not yet implemented, skipping...');
          stats.skipped++;
        } else {
          if (!NavigationModel) {
            throw new Error('NavigationModel not initialized');
          }
          
          // Check if exists
          const existing = await NavigationModel.findOne({ id: doc.id });

          if (existing) {
            if (options.skipExisting) {
              console.log(`  ⊘ Skipped existing: ${doc.id}`);
              stats.skipped++;
            } else {
              await NavigationModel.updateOne(
                { id: doc.id },
                { $set: { ...doc, updatedAt: new Date() } }
              );
              console.log(`  ↻ Updated: ${doc.id}`);
              stats.updated++;
            }
          } else {
            await NavigationModel.create(doc);
            console.log(`  + Inserted: ${doc.id}`);
            stats.inserted++;
          }
        }
      } catch (error) {
        stats.errors++;
        stats.errorDetails?.push({
          record: item,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`  ✗ Error processing ${item.label}: ${error}`);
      }
    }

    console.log('✓ Processing complete');
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }

  return stats;
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  const options = parseNavigationArgs(process.argv.slice(2));

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Navigation Seed Script                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Options:');
  console.log(`  Source:        ${options.source || 'file'}`);
  console.log(`  File:          ${options.file || 'default sample'}`);
  console.log(`  Prefix:        ${options.prefix || 'none'}`);
  console.log(`  Skip existing: ${options.skipExisting ? 'yes' : 'no'}`);
  console.log(`  Export i18n:   ${options.exportI18n ? 'yes' : 'no'}`);
  console.log(`  Dry run:       ${options.dryRun ? 'yes' : 'no'}`);
  console.log(`  Drop:          ${options.drop ? 'yes' : 'no'}`);
  console.log('');

  // Validate destructive operations
  if (!options.dryRun) {
    validateDestructiveOps(options);
  }

  let success = false;
  let stats: SeedStats | undefined;
  let error: string | undefined;

  try {
    stats = await seedNavigation(options);
    success = stats.errors === 0;

    console.log('');
    printStats(stats);

    if (options.exportI18n) {
      console.log('');
      console.log('i18n keys exported. Copy the contents to your frontend i18n files.');
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error('');
    console.error('Seed failed:', error);
    stats = {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      errorDetails: [{ record: null, error }],
    };
  } finally {
    // Close database connection
    if (connection.readyState === 1) {
      await connection.close();
    }
  }

  // Save report
  const duration = Date.now() - startTime;
  const report: SeedReport = {
    scriptName: 'seed-navigation',
    timestamp: new Date().toISOString(),
    options,
    stats: stats!,
    duration,
    success,
    error,
  };

  const reportPath = saveReport(report);
  console.log('');
  console.log(`Report saved to: ${reportPath}`);
  console.log('');
  console.log(success ? '✓ Seed completed successfully' : '✗ Seed completed with errors');

  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { seedNavigation, parseNavigationArgs, manifestItemToDocument };
