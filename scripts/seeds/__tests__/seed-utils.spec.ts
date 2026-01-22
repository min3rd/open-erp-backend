/**
 * Unit tests for seed utilities
 */

import {
  parseArgs,
  generateStrongPassword,
  createBatches,
  validateDestructiveOps,
  ProgressLogger,
  SeedOptions,
} from '../utils/seed-utils';

describe('Seed Utils', () => {
  describe('parseArgs', () => {
    it('should parse --count argument', () => {
      const args = ['--count', '100'];
      const opts = parseArgs(args);
      expect(opts.count).toBe(100);
    });

    it('should parse --batch-size argument', () => {
      const args = ['--batch-size', '50'];
      const opts = parseArgs(args);
      expect(opts.batchSize).toBe(50);
    });

    it('should parse boolean flags', () => {
      const args = [
        '--drop',
        '--confirm',
        '--dry-run',
        '--skip-if-exists',
        '--hierarchy',
      ];
      const opts = parseArgs(args);
      expect(opts.drop).toBe(true);
      expect(opts.confirm).toBe(true);
      expect(opts.dryRun).toBe(true);
      expect(opts.skipIfExists).toBe(true);
      expect(opts.hierarchy).toBe(true);
    });

    it('should parse --domain argument', () => {
      const args = ['--domain', 'example.com'];
      const opts = parseArgs(args);
      expect(opts.domain).toBe('example.com');
    });

    it('should parse --seed-superadmin-password argument', () => {
      const args = ['--seed-superadmin-password', 'MyPass123'];
      const opts = parseArgs(args);
      expect(opts.seedSuperadminPassword).toBe('MyPass123');
    });

    it('should handle multiple arguments', () => {
      const args = ['--count', '200', '--batch-size', '100', '--confirm'];
      const opts = parseArgs(args);
      expect(opts.count).toBe(200);
      expect(opts.batchSize).toBe(100);
      expect(opts.confirm).toBe(true);
    });

    it('should return empty object for no arguments', () => {
      const args: string[] = [];
      const opts = parseArgs(args);
      expect(opts).toEqual({});
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate password of default length 16', () => {
      const password = generateStrongPassword();
      expect(password.length).toBe(16);
    });

    it('should generate password of custom length', () => {
      const password = generateStrongPassword(20);
      expect(password.length).toBe(20);
    });

    it('should contain at least one uppercase letter', () => {
      const password = generateStrongPassword();
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should contain at least one lowercase letter', () => {
      const password = generateStrongPassword();
      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should contain at least one number', () => {
      const password = generateStrongPassword();
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should contain at least one special character', () => {
      const password = generateStrongPassword();
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = generateStrongPassword();
      const password2 = generateStrongPassword();
      const password3 = generateStrongPassword();

      // Very unlikely to generate same password twice
      expect(password1).not.toBe(password2);
      expect(password2).not.toBe(password3);
      expect(password1).not.toBe(password3);
    });
  });

  describe('createBatches', () => {
    it('should create correct number of batches', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = createBatches(items, 10);
      expect(batches.length).toBe(10);
    });

    it('should create batches of correct size', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = createBatches(items, 10);
      batches.forEach((batch) => {
        expect(batch.length).toBe(10);
      });
    });

    it('should handle items not evenly divisible by batch size', () => {
      const items = Array.from({ length: 105 }, (_, i) => i);
      const batches = createBatches(items, 10);

      expect(batches.length).toBe(11);
      expect(batches[10].length).toBe(5); // Last batch has 5 items
    });

    it('should preserve item order', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const batches = createBatches(items, 3);

      expect(batches[0]).toEqual([1, 2, 3]);
      expect(batches[1]).toEqual([4, 5, 6]);
      expect(batches[2]).toEqual([7, 8, 9]);
      expect(batches[3]).toEqual([10]);
    });

    it('should handle empty array', () => {
      const items: number[] = [];
      const batches = createBatches(items, 10);
      expect(batches.length).toBe(0);
    });

    it('should handle batch size larger than items', () => {
      const items = [1, 2, 3];
      const batches = createBatches(items, 10);
      expect(batches.length).toBe(1);
      expect(batches[0]).toEqual([1, 2, 3]);
    });
  });

  describe('validateDestructiveOps', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      processExitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number) => {
          throw new Error(`process.exit called with code ${code}`);
        });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should exit when --drop is used without --confirm', () => {
      const opts: SeedOptions = { drop: true };

      expect(() => {
        validateDestructiveOps(opts);
      }).toThrow('process.exit called with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ERROR: --drop requires --confirm flag for safety',
      );
    });

    it('should not exit when --drop is used with --confirm', () => {
      const opts: SeedOptions = { drop: true, confirm: true };

      expect(() => {
        validateDestructiveOps(opts);
      }).not.toThrow();
    });

    it('should not exit when --drop is not used', () => {
      const opts: SeedOptions = {};

      expect(() => {
        validateDestructiveOps(opts);
      }).not.toThrow();
    });
  });

  describe('ProgressLogger', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should initialize with correct total', () => {
      const logger = new ProgressLogger(1000);
      expect(logger).toBeDefined();
    });

    it('should log progress at 1000 item intervals', () => {
      const logger = new ProgressLogger(10000);

      // Increment 1000 times
      for (let i = 0; i < 1000; i++) {
        logger.increment();
      }

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(
        consoleLogSpy.mock.calls.some((call) =>
          call[0].includes('Progress: 1000/10000'),
        ),
      ).toBe(true);
    });

    it('should increment by custom amount', () => {
      const logger = new ProgressLogger(10000);

      logger.increment(500);
      logger.increment(500);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(
        consoleLogSpy.mock.calls.some((call) =>
          call[0].includes('Progress: 1000/10000'),
        ),
      ).toBe(true);
    });

    it('should show completion on finish', () => {
      const logger = new ProgressLogger(100);

      for (let i = 0; i < 100; i++) {
        logger.increment();
      }

      logger.finish();

      expect(
        consoleLogSpy.mock.calls.some((call) =>
          call[0].includes('Completed: 100/100'),
        ),
      ).toBe(true);
    });

    it('should include elapsed time in logs', () => {
      const logger = new ProgressLogger(1000);

      for (let i = 0; i < 1000; i++) {
        logger.increment();
      }

      const progressLogs = consoleLogSpy.mock.calls.filter((call) =>
        call[0].includes('elapsed'),
      );

      expect(progressLogs.length).toBeGreaterThan(0);
    });
  });
});
