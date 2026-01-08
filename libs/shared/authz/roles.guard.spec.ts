import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserContext } from './permissions.guard';
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from './decorators';
import { Role } from '@shared/types/role.enum';
import { AUTH_INSUFFICIENT_PERMISSIONS, AUTH_UNAUTHORIZED } from '../errors/error-codes';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  function createMockExecutionContext(
    user?: UserContext,
    route?: string,
    authHeader?: string,
  ): ExecutionContext {
    const mockRequest = {
      user,
      route: { path: route || '/test' },
      url: '/test',
      method: 'GET',
      params: {},
      headers: authHeader ? { authorization: authHeader } : {},
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
    });
  });

  describe('Role requirements', () => {
    it('should allow access when no roles are required', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'user123',
        email: 'test@example.com',
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is not authenticated', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.USER];
        return undefined;
      });
      
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should allow access when user has required role', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.USER];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'user123',
        email: 'test@example.com',
        roles: [Role.USER],
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.ORGANIZATION_ADMIN];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'user123',
        email: 'test@example.com',
        roles: [Role.USER],
      };
      const context = createMockExecutionContext(user);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when user has one of multiple required roles', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.ORGANIZATION_ADMIN, Role.MANAGER];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'user123',
        email: 'test@example.com',
        roles: [Role.MANAGER],
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('SYSTEM_ADMIN bypass', () => {
    it('should allow SYSTEM_ADMIN to bypass role requirements', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.ORGANIZATION_ADMIN];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'admin123',
        email: 'admin@example.com',
        roles: [Role.SYSTEM_ADMIN],
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow SYSTEM_ADMIN even with no other roles', async () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === REQUIRED_ROLES_KEY) return [Role.USER];
        return undefined;
      });
      
      const user: UserContext = {
        userId: 'admin123',
        email: 'admin@example.com',
        roles: [Role.SYSTEM_ADMIN],
      };
      const context = createMockExecutionContext(user);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
