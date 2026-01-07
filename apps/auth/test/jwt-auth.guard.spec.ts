import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@shared/authz/decorators';
import * as jwt from 'jsonwebtoken';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  const testSecret = 'test-secret-key';

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);

    // Set JWT secret for tests
    process.env.JWT_SECRET = testSecret;
  });

  function createMockExecutionContext(
    headers: Record<string, string> = {},
  ): ExecutionContext {
    const mockRequest = {
      headers,
      user: undefined,
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

  describe('Protected routes - authentication required', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    it('should deny access when Authorization header is missing', async () => {
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error.message).toBe('Authorization header is required');
      }
    });

    it('should deny access when Authorization header is malformed', async () => {
      const context = createMockExecutionContext({
        authorization: 'InvalidFormat',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error.message).toBe('Bearer token is required');
      }
    });

    it('should deny access when token type is not Bearer', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic some-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error.message).toBe('Bearer token is required');
      }
    });

    it('should deny access when token is missing after Bearer keyword', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer ',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny access when token is invalid', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error.message).toBe('Invalid or expired token');
      }
    });

    it('should deny access when token is expired', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', type: 'access' },
        testSecret,
        { expiresIn: '-1h' }, // Expired 1 hour ago
      );

      const context = createMockExecutionContext({
        authorization: `Bearer ${expiredToken}`,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error.message).toBe('Invalid or expired token');
      }
    });

    it('should allow access with valid token and set user in request', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      // Create a valid token
      const validToken = jwt.sign(
        { sub: userId, email, type: 'access' },
        testSecret,
        { expiresIn: '1h' },
      );

      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        user: undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.userId).toBe(userId);
      expect(mockRequest.user.email).toBe(email);
    });

    it('should allow access with token containing additional claims', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      // Create a token with additional claims
      const validToken = jwt.sign(
        {
          sub: userId,
          email,
          type: 'access',
          roles: ['admin'],
          organizationId: 'organization-1',
        },
        testSecret,
        { expiresIn: '1h' },
      );

      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
        user: undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.userId).toBe(userId);
      expect(mockRequest.user.email).toBe(email);
    });
  });
});
