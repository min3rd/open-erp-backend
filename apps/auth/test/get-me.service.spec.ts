import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { StandardizedException } from '@shared/errors';
import { Types } from 'mongoose';
import { AuthorizationService } from '@shared/authz';

// Mock RabbitMQ client
const mockRabbitMQClient = {
  publishEvent: jest.fn().mockResolvedValue(undefined),
  sendRPCRequest: jest.fn(),
};

// Mock Verification Token Repository
const mockVerificationTokenRepository = {
  create: jest.fn().mockResolvedValue({ token: '123456' }),
  countRecentTokens: jest.fn().mockResolvedValue(0),
};

// Mock Refresh Token Repository
const mockRefreshTokenRepository = {
  create: jest.fn().mockResolvedValue({
    userId: new Types.ObjectId(),
    token: 'mock-refresh-token',
    expiresAt: new Date(),
  }),
  findByToken: jest.fn(),
  revokeToken: jest.fn(),
};

// Mock Password Reset Token Repository
const mockPasswordResetTokenRepository = {
  create: jest.fn(),
  findValidToken: jest.fn(),
  findToken: jest.fn(),
  markAsUsed: jest.fn(),
  countRecentTokens: jest.fn().mockResolvedValue(0),
};

// Mock Authorization Service
const mockAuthorizationService = {
  getUserRolesWithDetails: jest.fn(),
  getEffectivePermissions: jest.fn(),
};

describe('AuthService - GetMe Integration Tests', () => {
  let service: AuthService;
  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: VerificationTokenRepository,
          useValue: mockVerificationTokenRepository,
        },
        {
          provide: RefreshTokenRepository,
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: PasswordResetTokenRepository,
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getMe - successful retrieval', () => {
    it('should successfully return user profile for active user', async () => {
      // Mock RPC to return active user
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserById') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              username: 'testuser',
              fullName: 'Test User',
              avatarUrl: 'https://example.com/avatar.jpg',
              status: 'active',
              verifiedAt: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01'),
            });
          }
          return Promise.resolve(null);
        },
      );

      // Mock authorization service
      mockAuthorizationService.getUserRolesWithDetails.mockResolvedValue([
        {
          role: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
            code: 'SYSTEM_ADMIN',
            name: 'System Administrator',
            description: 'Full system access',
            scope: 'global',
          },
          grantedAt: new Date('2024-01-01'),
        },
      ]);

      mockAuthorizationService.getEffectivePermissions.mockResolvedValue([
        'users.create',
        'users.read',
        'users.update',
        'users.delete',
      ]);

      const result = await service.getMe(mockUserId);

      expect(result).toEqual({
        id: mockUserId,
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        status: 'active',
        verifiedAt: expect.any(Date),
        createdAt: expect.any(Date),
        roles: [
          {
            id: '507f1f77bcf86cd799439012',
            code: 'SYSTEM_ADMIN',
            name: 'System Administrator',
            description: 'Full system access',
          },
        ],
        permissions: [
          'users.create',
          'users.read',
          'users.update',
          'users.delete',
        ],
      });

      expect(mockRabbitMQClient.sendRPCRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'findUserById',
        { userId: mockUserId },
      );

      expect(mockAuthorizationService.getUserRolesWithDetails).toHaveBeenCalledWith(mockUserId);
      expect(mockAuthorizationService.getEffectivePermissions).toHaveBeenCalledWith(mockUserId, 'global');
    });

    it('should return user profile with null avatarUrl if not set', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserById') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              username: 'testuser',
              fullName: 'Test User',
              avatarUrl: null,
              status: 'active',
              verifiedAt: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01'),
            });
          }
          return Promise.resolve(null);
        },
      );

      mockAuthorizationService.getUserRolesWithDetails.mockResolvedValue([]);
      mockAuthorizationService.getEffectivePermissions.mockResolvedValue([]);

      const result = await service.getMe(mockUserId);

      expect(result.avatarUrl).toBeNull();
      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
    });

    it('should return only global roles and filter out organization roles', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserById') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              username: 'testuser',
              fullName: 'Test User',
              avatarUrl: null,
              status: 'active',
              verifiedAt: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01'),
            });
          }
          return Promise.resolve(null);
        },
      );

      // Mock roles with both global and organization scope
      mockAuthorizationService.getUserRolesWithDetails.mockResolvedValue([
        {
          role: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
            code: 'SYSTEM_ADMIN',
            name: 'System Administrator',
            description: 'Full system access',
            scope: 'global',
          },
          grantedAt: new Date('2024-01-01'),
        },
        {
          role: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
            code: 'ORG_ADMIN',
            name: 'Organization Administrator',
            description: 'Organization level access',
            scope: 'organization',
          },
          grantedAt: new Date('2024-01-01'),
        },
      ]);

      mockAuthorizationService.getEffectivePermissions.mockResolvedValue([
        'users.create',
        'users.read',
      ]);

      const result = await service.getMe(mockUserId);

      // Should only include the global role
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].code).toBe('SYSTEM_ADMIN');
      expect(result.roles[0].id).toBe('507f1f77bcf86cd799439012');
    });
  });

  describe('getMe - error cases', () => {
    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockRabbitMQClient.sendRPCRequest.mockResolvedValue(null);

      await expect(service.getMe(mockUserId)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.getMe(mockUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(StandardizedException);
        expect(error.errorCode).toBe('USER_0001');
      }

      // Authorization service should not be called when user is not found
      expect(mockAuthorizationService.getUserRolesWithDetails).not.toHaveBeenCalled();
      expect(mockAuthorizationService.getEffectivePermissions).not.toHaveBeenCalled();
    });

    it('should throw AUTH_INVALID_CREDENTIALS when user is not active', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserById') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              username: 'testuser',
              fullName: 'Test User',
              status: 'pending',
              verifiedAt: null,
              createdAt: new Date('2024-01-01'),
            });
          }
          return Promise.resolve(null);
        },
      );

      await expect(service.getMe(mockUserId)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.getMe(mockUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(StandardizedException);
        expect(error.errorCode).toBe('AUTH_0002');
        expect(error.details).toEqual({
          reason: 'Account is not active',
        });
      }

      // Authorization service should not be called when user is not active
      expect(mockAuthorizationService.getUserRolesWithDetails).not.toHaveBeenCalled();
      expect(mockAuthorizationService.getEffectivePermissions).not.toHaveBeenCalled();
    });

    it('should throw AUTH_INVALID_CREDENTIALS when user is locked', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserById') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              username: 'testuser',
              fullName: 'Test User',
              status: 'locked',
              verifiedAt: new Date('2024-01-01'),
              createdAt: new Date('2024-01-01'),
            });
          }
          return Promise.resolve(null);
        },
      );

      await expect(service.getMe(mockUserId)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.getMe(mockUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(StandardizedException);
        expect(error.errorCode).toBe('AUTH_0002');
      }

      // Authorization service should not be called when user is locked
      expect(mockAuthorizationService.getUserRolesWithDetails).not.toHaveBeenCalled();
      expect(mockAuthorizationService.getEffectivePermissions).not.toHaveBeenCalled();
    });
  });
});
