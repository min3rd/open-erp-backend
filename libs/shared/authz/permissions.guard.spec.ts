import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard, UserContext } from './permissions.guard';
import { AuthorizationService } from './authorization.service';
import { IS_PUBLIC_KEY } from './decorators';
import {
  AUTH_INSUFFICIENT_PERMISSIONS,
  AUTH_UNAUTHORIZED,
  AUTH_FORBIDDEN_CROSS_TENANT,
} from '../errors/error-codes';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockAuthorizationService = {
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
      hasRole: jest.fn(),
      hasAnyRole: jest.fn(),
      isSystemAdmin: jest.fn(),
      isTenantAdmin: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    authorizationService = module.get(AuthorizationService);
    reflector = module.get(Reflector);
  });

  function createMockExecutionContext(
    user?: UserContext,
    route?: string,
  ): ExecutionContext {
    const mockRequest = {
      user,
      route: { path: route || '/test' },
      url: '/test',
      method: 'GET',
      params: {},
      headers: {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  describe('Public routes', () => {
    it('should allow access to public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('Authentication', () => {
    it('should deny access when user is not authenticated', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_UNAUTHORIZED,
          }),
        }),
      );
    });

    it('should deny access when user object is missing userId', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({} as UserContext);

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_UNAUTHORIZED,
          }),
        }),
      );
    });
  });

  describe('Role-based authorization', () => {
    it('should allow access when user has required role', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['SYSTEM_ADMIN']); // requiredRoles

      authorizationService.hasAnyRole.mockResolvedValue(true);

      const context = createMockExecutionContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationService.hasAnyRole).toHaveBeenCalledWith('user123', [
        'SYSTEM_ADMIN',
      ]);
    });

    it('should deny access when user lacks required role', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['SYSTEM_ADMIN']); // requiredRoles

      authorizationService.hasAnyRole.mockResolvedValue(false);

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
          }),
        }),
      );
    });
  });

  describe('Permission-based authorization', () => {
    it('should allow access when no permissions are required', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(undefined); // requiredPermissions

      const context = createMockExecutionContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check all required permissions by default', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create', 'order.update']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      const context = createMockExecutionContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(
        'user123',
        ['order.create', 'order.update'],
        { scope: 'tenant', organizationId: 'tenant123' },
      );
    });

    it('should check any permission when mode is "any"', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.delete', 'order.manage']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('any'); // mode

      authorizationService.hasAnyPermission.mockResolvedValue(true);

      const context = createMockExecutionContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationService.hasAnyPermission).toHaveBeenCalledWith(
        'user123',
        ['order.delete', 'order.manage'],
        { scope: 'tenant', organizationId: 'tenant123' },
      );
    });

    it('should deny access when user lacks required permissions', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockResolvedValue(false);

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
            message: expect.stringContaining('order.create'),
          }),
        }),
      );
    });
  });

  describe('Scope handling', () => {
    it('should use global scope when specified', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['system.admin']) // requiredPermissions
        .mockReturnValueOnce('global') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      const context = createMockExecutionContext(user);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(
        'user123',
        ['system.admin'],
        { scope: 'global', organizationId: 'tenant123' },
      );
    });

    it('should deny organization-scoped access when organizationId is missing', async () => {
      const user: UserContext = { userId: 'user123' }; // No organizationId
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_FORBIDDEN_CROSS_TENANT,
          }),
        }),
      );
    });
  });

  describe('Cross-tenant access validation', () => {
    it('should deny cross-tenant access for non-admin users', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      const context = createMockExecutionContext(user);
      const request = context.switchToHttp().getRequest();
      request.params = { organizationId: 'tenant456' }; // Different tenant

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.isSystemAdmin.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errorCode: AUTH_FORBIDDEN_CROSS_TENANT,
          }),
        }),
      );
    });

    it('should allow cross-tenant access for system admins', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      const context = createMockExecutionContext(user);
      const request = context.switchToHttp().getRequest();
      request.params = { organizationId: 'tenant456' }; // Different tenant

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.isSystemAdmin.mockResolvedValue(true);
      authorizationService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when organizationId from JWT matches organizationId in URL', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      const context = createMockExecutionContext(user);
      const request = context.switchToHttp().getRequest();
      request.params = { organizationId: 'tenant123' }; // Same tenant

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should get organizationId from x-tenant-id header when not in JWT', async () => {
      const user: UserContext = { userId: 'user123' }; // No organizationId in JWT
      const context = createMockExecutionContext(user);
      const request = context.switchToHttp().getRequest();
      request.headers = { 'x-tenant-id': 'tenant123' };
      request.params = {}; // No organizationId in params

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationService.hasAllPermissions).toHaveBeenCalledWith(
        'user123',
        ['order.create'],
        { scope: 'tenant', organizationId: 'tenant123' },
      );
    });
  });

  describe('Error handling', () => {
    it('should fail closed on unexpected errors', async () => {
      const user: UserContext = { userId: 'user123', organizationId: 'tenant123' };
      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined) // requiredRoles
        .mockReturnValueOnce(['order.create']) // requiredPermissions
        .mockReturnValueOnce('tenant') // scope
        .mockReturnValueOnce('all'); // mode

      authorizationService.hasAllPermissions.mockRejectedValue(
        new Error('Database error'),
      );

      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
