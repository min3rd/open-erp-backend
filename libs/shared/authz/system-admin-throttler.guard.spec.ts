import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemAdminThrottlerGuard } from './system-admin-throttler.guard';
import { Role } from '@shared/types/role.enum';
import { ThrottlerStorage, ThrottlerModuleOptions } from '@nestjs/throttler';

describe('SystemAdminThrottlerGuard', () => {
  let guard: SystemAdminThrottlerGuard;
  let mockStorage: jest.Mocked<ThrottlerStorage>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockStorage = {
      increment: jest.fn(),
      getRecord: jest.fn(),
    } as any;

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    const mockOptions: ThrottlerModuleOptions = {
      throttlers: [{ ttl: 60, limit: 10 }],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminThrottlerGuard,
        {
          provide: 'THROTTLER_OPTIONS',
          useValue: mockOptions,
        },
        {
          provide: 'THROTTLER_STORAGE',
          useValue: mockStorage,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<SystemAdminThrottlerGuard>(SystemAdminThrottlerGuard);
  });

  function createMockExecutionContext(user?: any): ExecutionContext {
    const mockRequest = {
      user,
      route: { path: '/test' },
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  }

  it('should bypass throttling for SYSTEM_ADMIN users', async () => {
    const user = {
      userId: 'admin-user-123',
      email: 'admin@example.com',
      roles: [Role.SUPER_ADMIN],
    };

    const context = createMockExecutionContext(user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // Verify storage was not checked (bypass)
    expect(mockStorage.increment).not.toHaveBeenCalled();
  });

  it('should apply throttling for regular users', async () => {
    const user = {
      userId: 'regular-user-123',
      email: 'user@example.com',
      roles: [Role.USER],
    };

    const context = createMockExecutionContext(user);

    // Mock storage to allow the request (under limit)
    mockStorage.getRecord.mockResolvedValue([]);
    mockStorage.increment.mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // For regular users, throttling should be checked
    expect(mockStorage.increment).toHaveBeenCalled();
  });

  it('should bypass throttling for users with multiple roles including SYSTEM_ADMIN', async () => {
    const user = {
      userId: 'multi-role-user',
      email: 'multirole@example.com',
      roles: [Role.USER, Role.SUPER_ADMIN, Role.ORGANIZATION_ADMIN],
    };

    const context = createMockExecutionContext(user);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // Should bypass due to SYSTEM_ADMIN role
    expect(mockStorage.increment).not.toHaveBeenCalled();
  });

  it('should apply throttling when user has no SYSTEM_ADMIN role', async () => {
    const user = {
      userId: 'org-admin',
      email: 'orgadmin@example.com',
      roles: [Role.ORGANIZATION_ADMIN, Role.USER_ADMIN],
    };

    const context = createMockExecutionContext(user);

    // Mock storage to allow the request
    mockStorage.getRecord.mockResolvedValue([]);
    mockStorage.increment.mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // Should check throttling
    expect(mockStorage.increment).toHaveBeenCalled();
  });

  it('should apply throttling when user object has no roles', async () => {
    const user = {
      userId: 'user-no-roles',
      email: 'noroles@example.com',
    };

    const context = createMockExecutionContext(user);

    // Mock storage to allow the request
    mockStorage.getRecord.mockResolvedValue([]);
    mockStorage.increment.mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });

    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    // Should check throttling
    expect(mockStorage.increment).toHaveBeenCalled();
  });
});
