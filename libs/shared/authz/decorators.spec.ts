import { Reflector } from '@nestjs/core';
import {
  Public,
  Permissions,
  Roles,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
  PERMISSION_SCOPE_KEY,
  PERMISSION_MODE_KEY,
} from './decorators';

describe('Authorization Decorators', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('@Public()', () => {
    it('should set isPublic metadata to true', () => {
      class TestController {
        @Public()
        publicMethod() {}
      }

      const metadata = reflector.get(
        IS_PUBLIC_KEY,
        TestController.prototype.publicMethod,
      );
      expect(metadata).toBe(true);
    });
  });

  describe('@Permissions()', () => {
    it('should set required permissions metadata for single permission', () => {
      class TestController {
        @Permissions('order.create')
        createOrder() {}
      }

      const permissions = reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.createOrder,
      );
      expect(permissions).toEqual(['order.create']);
    });

    it('should set required permissions metadata for multiple permissions', () => {
      class TestController {
        @Permissions(['order.create', 'order.update'])
        manageOrder() {}
      }

      const permissions = reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.manageOrder,
      );
      expect(permissions).toEqual(['order.create', 'order.update']);
    });

    it('should set default scope to tenant', () => {
      class TestController {
        @Permissions('order.create')
        createOrder() {}
      }

      const scope = reflector.get(
        PERMISSION_SCOPE_KEY,
        TestController.prototype.createOrder,
      );
      expect(scope).toBe('tenant');
    });

    it('should set scope to global when specified', () => {
      class TestController {
        @Permissions('system.admin', { scope: 'global' })
        adminAction() {}
      }

      const scope = reflector.get(
        PERMISSION_SCOPE_KEY,
        TestController.prototype.adminAction,
      );
      expect(scope).toBe('global');
    });

    it('should set default mode to all', () => {
      class TestController {
        @Permissions(['order.create', 'order.update'])
        createOrder() {}
      }

      const mode = reflector.get(
        PERMISSION_MODE_KEY,
        TestController.prototype.createOrder,
      );
      expect(mode).toBe('all');
    });

    it('should set mode to any when specified', () => {
      class TestController {
        @Permissions(['order.delete', 'order.manage'], { mode: 'any' })
        deleteOrder() {}
      }

      const mode = reflector.get(
        PERMISSION_MODE_KEY,
        TestController.prototype.deleteOrder,
      );
      expect(mode).toBe('any');
    });

    it('should support both scope and mode options', () => {
      class TestController {
        @Permissions(['system.admin', 'system.config'], {
          scope: 'global',
          mode: 'any',
        })
        configureSystem() {}
      }

      const permissions = reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.configureSystem,
      );
      const scope = reflector.get(
        PERMISSION_SCOPE_KEY,
        TestController.prototype.configureSystem,
      );
      const mode = reflector.get(
        PERMISSION_MODE_KEY,
        TestController.prototype.configureSystem,
      );

      expect(permissions).toEqual(['system.admin', 'system.config']);
      expect(scope).toBe('global');
      expect(mode).toBe('any');
    });
  });

  describe('@Roles()', () => {
    it('should set required roles metadata for single role', () => {
      class TestController {
        @Roles('SYSTEM_ADMIN')
        adminAction() {}
      }

      const roles = reflector.get(
        REQUIRED_ROLES_KEY,
        TestController.prototype.adminAction,
      );
      expect(roles).toEqual(['SYSTEM_ADMIN']);
    });

    it('should set required roles metadata for multiple roles', () => {
      class TestController {
        @Roles(['TENANT_ADMIN', 'MANAGER'])
        manageResource() {}
      }

      const roles = reflector.get(
        REQUIRED_ROLES_KEY,
        TestController.prototype.manageResource,
      );
      expect(roles).toEqual(['TENANT_ADMIN', 'MANAGER']);
    });
  });

  describe('Decorator combinations', () => {
    it('should allow combining @Permissions and other decorators', () => {
      class TestController {
        @Permissions('order.create')
        @Public() // This wouldn't make sense in practice, but testing metadata
        createOrder() {}
      }

      const permissions = reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.createOrder,
      );
      const isPublic = reflector.get(
        IS_PUBLIC_KEY,
        TestController.prototype.createOrder,
      );

      expect(permissions).toEqual(['order.create']);
      expect(isPublic).toBe(true);
    });

    it('should preserve metadata when multiple decorators are used', () => {
      class TestController {
        @Permissions(['order.create', 'order.update'], { scope: 'tenant' })
        @Roles('MANAGER')
        manageOrders() {}
      }

      const permissions = reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        TestController.prototype.manageOrders,
      );
      const roles = reflector.get(
        REQUIRED_ROLES_KEY,
        TestController.prototype.manageOrders,
      );
      const scope = reflector.get(
        PERMISSION_SCOPE_KEY,
        TestController.prototype.manageOrders,
      );

      expect(permissions).toEqual(['order.create', 'order.update']);
      expect(roles).toEqual(['MANAGER']);
      expect(scope).toBe('tenant');
    });
  });
});
