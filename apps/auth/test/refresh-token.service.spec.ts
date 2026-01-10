import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { RefreshTokenDto } from '../src/dto/refresh-token.dto';
import { StandardizedException } from '@shared/errors';
import { Types } from 'mongoose';
import { of } from 'rxjs';
import {
  AUTH_REFRESH_TOKEN_INVALID,
  AUTH_REFRESH_TOKEN_EXPIRED,
  AUTH_REFRESH_TOKEN_REVOKED,
  AUTH_REFRESH_TOKEN_REUSED,
  USER_NOT_FOUND,
  AUTH_INVALID_CREDENTIALS,
} from '@shared/errors/error-codes';
import {
  hashRefreshToken,
  generateRefreshToken,
} from '../src/utils/token.util';

// Mock RabbitMQ client
const mockUserClient = {
  send: jest.fn(),
  emit: jest.fn().mockReturnValue(undefined),
};

const mockNotificationClient = {
  send: jest.fn(),
  emit: jest.fn().mockReturnValue(undefined),
};

// Mock Verification Token Repository
const mockVerificationTokenRepository = {
  create: jest.fn(),
  countRecentTokens: jest.fn().mockResolvedValue(0),
};

// Mock Password Reset Token Repository
const mockPasswordResetTokenRepository = {
  create: jest.fn(),
  findValidToken: jest.fn(),
  findToken: jest.fn(),
  markAsUsed: jest.fn(),
  countRecentTokens: jest.fn().mockResolvedValue(0),
};

describe('AuthService - Refresh Token Integration Tests', () => {
  let service: AuthService;
  let refreshTokenRepository: RefreshTokenRepository;
  const mockUserId = new Types.ObjectId();
  const testSecret = 'test-secret-key';
  const mockUser = {
    id: mockUserId.toString(),
    _id: mockUserId,
    email: 'test@example.com',
    fullName: 'Test User',
    username: 'testuser',
    status: 'active',
    verifiedAt: new Date(),
    roleAssignments: [
      {
        roleId: {
          code: 'USER',
          name: 'User',
        },
      },
    ],
  };

  beforeEach(async () => {
    // Mock refresh token repository
    const mockRefreshTokenRepository = {
      create: jest.fn().mockImplementation((userId, tokenHash, expiresAt) => {
        return Promise.resolve({
          _id: new Types.ObjectId(),
          userId,
          tokenHash,
          expiresAt,
          revoked: false,
          isRotated: false,
          save: jest.fn(),
        });
      }),
      findByTokenHash: jest.fn(),
      findValidByTokenHash: jest.fn(),
      markAsRotated: jest.fn().mockResolvedValue({}),
      revokeAllUserTokens: jest.fn().mockResolvedValue(1),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'RABBITMQ_USER_CLIENT',
          useValue: mockUserClient,
        },
        {
          provide: 'RABBITMQ_NOTIFICATION_CLIENT',
          useValue: mockNotificationClient,
        },
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
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
    refreshTokenRepository = moduleRef.get<RefreshTokenRepository>(
      RefreshTokenRepository,
    );

    // Reset mocks before each test
    jest.clearAllMocks();

    // Set JWT environment variables for tests
    process.env.JWT_SECRET = testSecret;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('refreshToken - successful refresh', () => {
    it('should successfully refresh token with valid refresh token', async () => {
      // Generate a test refresh token
      const refreshToken = generateRefreshToken();
      // Compute hash using the secret set in beforeEach
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      // Mock stored token
      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        revoked: false,
        isRotated: false,
        deviceInfo: null,
        ipAddress: null,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      // Mock user service response
      mockUserClient.send.mockReturnValue(of(mockUser));

      // Call refresh
      const dto: RefreshTokenDto = { refreshToken };
      const result = await service.refreshToken(dto);

      // Assertions
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken); // New token should be different
      expect(result.user).toEqual({
        email: mockUser.email,
        fullName: mockUser.fullName,
        avatarUrl: null,
      });

      // Verify repository calls
      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        expect.any(String), // The hash is computed inside the service
      );
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.markAsRotated).toHaveBeenCalledWith(
        expect.any(String), // The hash is computed inside the service
        expect.any(Types.ObjectId),
      );
    });
  });

  describe('refreshToken - invalid token', () => {
    it('should throw error for non-existent refresh token', async () => {
      const refreshToken = generateRefreshToken();

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        null,
      );

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(AUTH_REFRESH_TOKEN_INVALID);
      }
    });
  });

  describe('refreshToken - expired token', () => {
    it('should throw error for expired refresh token', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        revoked: false,
        isRotated: false,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(AUTH_REFRESH_TOKEN_EXPIRED);
      }
    });
  });

  describe('refreshToken - revoked token', () => {
    it('should throw error for revoked refresh token', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: true,
        revokedReason: 'manual',
        isRotated: false,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(AUTH_REFRESH_TOKEN_REVOKED);
      }
    });
  });

  describe('refreshToken - token reuse detection', () => {
    it('should detect and revoke all tokens when rotated token is reused', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: true,
        isRotated: true, // Token was already rotated
        replacedByTokenId: new Types.ObjectId(),
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(AUTH_REFRESH_TOKEN_REUSED);
      }

      // Verify all user tokens were revoked
      expect(refreshTokenRepository.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUserId,
        'token_reuse_detected',
      );

      // Verify logout event was emitted
      expect(mockUserClient.emit).toHaveBeenCalled();
    });
  });

  describe('refreshToken - user validation', () => {
    it('should throw error if user not found', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        isRotated: false,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      mockUserClient.send.mockReturnValue(of(null));

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(USER_NOT_FOUND);
      }
    });

    it('should throw error if user account is inactive', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        isRotated: false,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      const inactiveUser = {
        ...mockUser,
        status: 'suspended',
      };

      mockUserClient.send.mockReturnValue(of(inactiveUser));

      const dto: RefreshTokenDto = { refreshToken };

      await expect(service.refreshToken(dto)).rejects.toThrow(
        StandardizedException,
      );

      try {
        await service.refreshToken(dto);
      } catch (error: any) {
        expect(error.errorCode).toBe(AUTH_INVALID_CREDENTIALS);
      }
    });
  });

  describe('refreshToken - token rotation', () => {
    it('should mark old token as rotated after successful refresh', async () => {
      const refreshToken = generateRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken, testSecret);

      const storedToken = {
        _id: new Types.ObjectId(),
        userId: mockUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        isRotated: false,
      };

      (refreshTokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(
        storedToken,
      );

      mockUserClient.send.mockReturnValue(of(mockUser));

      const dto: RefreshTokenDto = { refreshToken };
      await service.refreshToken(dto);

      // Verify old token was marked as rotated
      expect(refreshTokenRepository.markAsRotated).toHaveBeenCalledWith(
        tokenHash,
        expect.any(Types.ObjectId),
      );
    });
  });
});
