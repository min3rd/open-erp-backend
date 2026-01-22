/**
 * Shared utilities for seed scripts
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SeedOptions {
  count?: number;
  batchSize?: number;
  drop?: boolean;
  dryRun?: boolean;
  confirm?: boolean;
  limit?: number;
  skip?: number;
  seedSuperadminPassword?: string;
  skipIfExists?: boolean;
  domain?: string;
  hierarchy?: boolean;
}

export interface SeedStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails?: Array<{ record: any; error: string }>;
}

export interface SeedReport {
  scriptName: string;
  timestamp: string;
  options: SeedOptions;
  stats: SeedStats;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Parse command line arguments into options
 */
export function parseArgs(args: string[]): SeedOptions {
  const opts: SeedOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--count':
        if (args[i + 1]) {
          opts.count = parseInt(args[i + 1], 10);
          i++;
        }
        break;
      case '--batch-size':
        if (args[i + 1]) {
          opts.batchSize = parseInt(args[i + 1], 10);
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
      case '--drop':
        opts.drop = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--confirm':
        opts.confirm = true;
        break;
      case '--skip-if-exists':
        opts.skipIfExists = true;
        break;
      case '--hierarchy':
        opts.hierarchy = true;
        break;
      case '--domain':
        if (args[i + 1]) {
          opts.domain = args[i + 1];
          i++;
        }
        break;
      case '--seed-superadmin-password':
        if (args[i + 1]) {
          opts.seedSuperadminPassword = args[i + 1];
          i++;
        }
        break;
    }
  }
  
  return opts;
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const all = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Save seed report to JSON file
 */
export function saveReport(report: SeedReport): string {
  const reportsDir = path.join(__dirname, '../reports');
  
  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const timestamp = report.timestamp.replace(/[:.]/g, '-');
  const filename = `${timestamp}-${report.scriptName}-report.json`;
  const filepath = path.join(reportsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  
  return filepath;
}

/**
 * Print statistics summary
 */
export function printStats(stats: SeedStats): void {
  console.log('\nStatistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Inserted: ${stats.inserted}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  
  if (stats.errorDetails && stats.errorDetails.length > 0) {
    console.log('\nError Details:');
    stats.errorDetails.slice(0, 5).forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.error}`);
      if (err.record) {
        console.log(`     Record: ${JSON.stringify(err.record).substring(0, 100)}...`);
      }
    });
    if (stats.errorDetails.length > 5) {
      console.log(`  ... and ${stats.errorDetails.length - 5} more errors`);
    }
  }
}

/**
 * Validate destructive operations
 */
export function validateDestructiveOps(opts: SeedOptions): void {
  if (opts.drop && !opts.confirm) {
    console.error('ERROR: --drop requires --confirm flag for safety');
    process.exit(1);
  }
}

/**
 * Create batches from array
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Progress logger for long operations
 */
export class ProgressLogger {
  private total: number;
  private current: number;
  private startTime: number;
  private lastLogTime: number;
  
  constructor(total: number) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.lastLogTime = Date.now();
  }
  
  increment(count: number = 1): void {
    this.current += count;
    
    // Log every 1000 items or every 5 seconds
    if (this.current % 1000 === 0 || Date.now() - this.lastLogTime > 5000) {
      this.log();
      this.lastLogTime = Date.now();
    }
  }
  
  log(): void {
    const percentage = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`  Progress: ${this.current}/${this.total} (${percentage}%) - ${elapsed}s elapsed`);
  }
  
  finish(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`  Completed: ${this.current}/${this.total} - ${elapsed}s total`);
  }
}
