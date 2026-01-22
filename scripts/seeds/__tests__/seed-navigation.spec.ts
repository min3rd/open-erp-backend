/**
 * Unit tests for navigation seed script
 */

import {
  parseNavigationArgs,
  manifestItemToDocument,
} from '../seed-navigation';

describe('Navigation Seed Script', () => {
  describe('parseNavigationArgs', () => {
    it('should parse --source argument', () => {
      const args = ['--source', 'fe'];
      const opts = parseNavigationArgs(args);
      expect(opts.source).toBe('fe');
    });

    it('should parse --file argument', () => {
      const args = ['--file', '/path/to/manifest.json'];
      const opts = parseNavigationArgs(args);
      expect(opts.file).toBe('/path/to/manifest.json');
    });

    it('should parse --prefix argument', () => {
      const args = ['--prefix', '/admin'];
      const opts = parseNavigationArgs(args);
      expect(opts.prefix).toBe('/admin');
    });

    it('should parse --skip-existing flag', () => {
      const args = ['--skip-existing'];
      const opts = parseNavigationArgs(args);
      expect(opts.skipExisting).toBe(true);
    });

    it('should parse --export-i18n flag', () => {
      const args = ['--export-i18n'];
      const opts = parseNavigationArgs(args);
      expect(opts.exportI18n).toBe(true);
    });

    it('should parse --push-api argument', () => {
      const args = ['--push-api', 'https://api.example.com'];
      const opts = parseNavigationArgs(args);
      expect(opts.pushApi).toBe('https://api.example.com');
    });

    it('should parse multiple arguments', () => {
      const args = [
        '--source',
        'file',
        '--file',
        'manifest.json',
        '--prefix',
        '/app',
        '--skip-existing',
        '--export-i18n',
        '--dry-run',
      ];
      const opts = parseNavigationArgs(args);
      expect(opts.source).toBe('file');
      expect(opts.file).toBe('manifest.json');
      expect(opts.prefix).toBe('/app');
      expect(opts.skipExisting).toBe(true);
      expect(opts.exportI18n).toBe(true);
      expect(opts.dryRun).toBe(true);
    });
  });

  describe('manifestItemToDocument', () => {
    it('should convert basic manifest item to document', () => {
      const item = {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'pi pi-home',
        module: 'main',
        scope: 'global' as const,
        order: 1,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.id).toMatch(/^nav-/);
      expect(doc.label).toBe('Dashboard');
      expect(doc.routerLink).toBe('/dashboard');
      expect(doc.icon).toBe('pi pi-home');
      expect(doc.moduleId).toBe('main');
      expect(doc.scope).toBe('global');
      expect(doc.order).toBe(1);
      expect(doc.createdBy).toBe('script');
      expect(doc.updatedBy).toBe('script');
    });

    it('should use provided id if present', () => {
      const item = {
        id: 'custom-id',
        label: 'Settings',
        route: '/settings',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.id).toBe('custom-id');
      expect(doc.label).toBe('Settings');
    });

    it('should apply route prefix', () => {
      const item = {
        label: 'Users',
        route: '/users',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, { prefix: '/admin' });

      expect(doc.routerLink).toBe('/admin/users');
    });

    it('should handle routerLink field', () => {
      const item = {
        label: 'Users',
        routerLink: '/users',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.routerLink).toBe('/users');
    });

    it('should handle array route format', () => {
      const item = {
        label: 'Users',
        route: ['users', 'list'] as any,
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.routerLink).toBe('/users/list');
    });

    it('should preserve parentId', () => {
      const item = {
        label: 'User List',
        route: '/users/list',
        parentId: 'nav-users',
        scope: 'module' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.parentId).toBe('nav-users');
    });

    it('should include permissions if provided', () => {
      const item = {
        label: 'Admin Panel',
        route: '/admin',
        scope: 'global' as const,
        permissions: {
          include: ['admin.access'],
          exclude: ['guest'],
        },
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.permissions).toEqual({
        include: ['admin.access'],
        exclude: ['guest'],
      });
    });

    it('should include meta if provided', () => {
      const item = {
        label: 'Reports',
        route: '/reports',
        scope: 'global' as const,
        meta: {
          customField: 'value',
          badge: 'new',
        },
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.meta).toEqual({
        customField: 'value',
        badge: 'new',
      });
    });

    it('should use default scope if not provided', () => {
      const item = {
        label: 'Home',
        route: '/home',
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.scope).toBe('global');
    });

    it('should use default order if not provided', () => {
      const item = {
        label: 'Home',
        route: '/home',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.order).toBe(0);
    });

    it('should handle module scope correctly', () => {
      const item = {
        label: 'Settings',
        route: '/settings',
        scope: 'module' as const,
        moduleId: 'user-management',
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.scope).toBe('module');
      expect(doc.moduleId).toBe('user-management');
    });

    it('should slugify label for id generation', () => {
      const item = {
        label: 'User Management',
        route: '/user-management',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      // Should convert spaces to dashes and lowercase
      expect(doc.id).toMatch(/nav-user-management/);
    });

    it('should handle special characters in label', () => {
      const item = {
        label: 'Tài khoản & Người dùng',
        route: '/accounts',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      // Slugify should handle special characters
      expect(doc.id).toBeTruthy();
      expect(doc.label).toBe('Tài khoản & Người dùng');
    });
  });

  describe('Slug Generation', () => {
    it('should generate valid slugs from labels', () => {
      // Import the internal function if needed, or test through manifestItemToDocument
      const testCases = [
        { label: 'User Management', expectedPattern: /nav-user-management/ },
        { label: 'Reports & Analytics', expectedPattern: /nav-reports/ },
        { label: 'Settings', expectedPattern: /nav-settings/ },
      ];

      testCases.forEach(({ label, expectedPattern }) => {
        const item = {
          label,
          route: `/${label.toLowerCase()}`,
          scope: 'global' as const,
        };
        const doc = manifestItemToDocument(item, {});
        expect(doc.id).toMatch(expectedPattern);
      });
    });
  });

  describe('Route Handling', () => {
    it('should ensure routes start with slash', () => {
      const item = {
        label: 'Dashboard',
        route: 'dashboard',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.routerLink).toBe('/dashboard');
    });

    it('should handle routes that already start with slash', () => {
      const item = {
        label: 'Dashboard',
        route: '/dashboard',
        scope: 'global' as const,
      };

      const doc = manifestItemToDocument(item, {});

      expect(doc.routerLink).toBe('/dashboard');
    });

    it('should apply prefix correctly', () => {
      const testCases = [
        { prefix: '/admin', route: '/users', expected: '/admin/users' },
        { prefix: 'admin', route: '/users', expected: '/admin/users' },
        { prefix: '/api/v1', route: '/data', expected: '/api/v1/data' },
      ];

      testCases.forEach(({ prefix, route, expected }) => {
        const item = {
          label: 'Test',
          route,
          scope: 'global' as const,
        };
        const doc = manifestItemToDocument(item, { prefix });
        expect(doc.routerLink).toBe(expected);
      });
    });
  });
});
