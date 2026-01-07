import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { VerifyEmailDto } from '../src/dto/verify-email.dto';
import { ResendVerificationDto } from '../src/dto/resend-verification.dto';
import { StandardizedException } from '@shared/errors';

// Mock RabbitMQ client
const mockRabbitMQClient = {
  publishEvent: jest.fn().mockResolvedValue(undefined),
  sendRPCRequest: jest.fn(),
};

// Mock Verification Token Repository
const mockVerificationTokenRepository = {
  create: jest.fn().mockResolvedValue({ token: '123456' }),
  countRecentTokens: jest.fn().mockResolvedValue(0),
  findValidToken: jest.fn(),
  findToken: jest.fn(),
  markAsUsed: jest.fn(),
};

// Mock Refresh Token Repository
const mockRefreshTokenRepository = {
  create: jest.fn().mockResolvedValue({
    userId: 'mock-user-id',
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

describe('AuthService - Email Verification Tests', () => {
  let service: AuthService;

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
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Default RPC responses
    mockRabbitMQClient.sendRPCRequest.mockImplementation(
      (exchange, routingKey, method, params) => {
        if (method === 'findUserByEmail') {
          return Promise.resolve({
            id: 'user123',
            _id: { toString: () => 'user123' },
            email: params.email,
            fullName: 'Test User',
            username: 'testuser',
            status: 'pending',
          });
        }
        if (method === 'updateUserStatus') {
          return Promise.resolve({ success: true });
        }
        if (method === 'sendVerificationEmail') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve(null);
      },
    );
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid code', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        email: 'test@example.com',
        code: '123456',
      };

      // Mock valid token
      mockVerificationTokenRepository.findValidToken.mockResolvedValue({
        _id: { toString: () => 'token123' },
        email: 'test@example.com',
        token: '123456',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: null,
      });

      const result = await service.verifyEmail(verifyEmailDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified successfully');
      expect(result.data.email).toBe(verifyEmailDto.email);
      expect(result.data.userId).toBe('user123');

      // Verify token was marked as used
      expect(mockVerificationTokenRepository.markAsUsed).toHaveBeenCalledWith(
        'token123',
      );

      // Verify user status was updated
      expect(mockRabbitMQClient.sendRPCRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'updateUserStatus',
        expect.objectContaining({
          email: verifyEmailDto.email,
          status: 'active',
          verifiedAt: expect.any(Date),
        }),
      );

      // Verify user.verified event was published
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'user.verified',
        expect.objectContaining({
          userId: 'user123',
          email: verifyEmailDto.email,
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should throw USER_NOT_FOUND error when user does not exist', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        email: 'nonexistent@example.com',
        code: '123456',
      };

      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        },
      );

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toMatchObject({
        errorCode: 'USER_0001',
      });
    });

    it('should throw AUTH_USER_ALREADY_VERIFIED error when user is already verified', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        email: 'verified@example.com',
        code: '123456',
      };

      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              _id: { toString: () => 'user123' },
              email: 'verified@example.com',
              status: 'active',
              verifiedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        },
      );

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toMatchObject({
        errorCode: 'AUTH_0009',
      });
    });

    it('should throw AUTH_VERIFICATION_CODE_INVALID error when code is invalid', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        email: 'test@example.com',
        code: '999999',
      };

      mockVerificationTokenRepository.findValidToken.mockResolvedValue(null);
      mockVerificationTokenRepository.findToken.mockResolvedValue(null);

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toMatchObject({
        errorCode: 'AUTH_0008',
      });
    });

    it('should throw AUTH_VERIFICATION_CODE_EXPIRED error when code is expired', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        email: 'test@example.com',
        code: '123456',
      };

      // No valid token
      mockVerificationTokenRepository.findValidToken.mockResolvedValue(null);

      // But token exists (just expired)
      mockVerificationTokenRepository.findToken.mockResolvedValue({
        _id: { toString: () => 'token123' },
        email: 'test@example.com',
        token: '123456',
        expiresAt: new Date(Date.now() - 10000), // Expired
        usedAt: null,
      });

      await expect(service.verifyEmail(verifyEmailDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.verifyEmail(verifyEmailDto)).rejects.toMatchObject({
        errorCode: 'AUTH_0007',
      });
    });
  });

  describe('resendVerification', () => {
    it('should successfully resend verification code', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(1);

      const result = await service.resendVerification(resendDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('sent to your email');
      expect(result.data.email).toBe(resendDto.email);
      expect(result.data.attemptsRemaining).toBe(1); // 3 max - 1 used - 1 current = 1

      // Verify new token was created
      expect(mockVerificationTokenRepository.create).toHaveBeenCalled();
      const createCall = mockVerificationTokenRepository.create.mock.calls[0];
      expect(createCall[0]).toBe(resendDto.email);
      expect(createCall[1]).toMatch(/^\d{6}$/);
      expect(createCall[2]).toBeInstanceOf(Date);

      // Verify email was sent
      const emailCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'sendVerificationEmail',
      );
      expect(emailCall).toBeDefined();
      expect(emailCall[3]).toEqual(
        expect.objectContaining({
          to: resendDto.email,
          verificationCode: expect.stringMatching(/^\d{6}$/),
        }),
      );
    });

    it('should return success even if user does not exist (security)', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'nonexistent@example.com',
      };

      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.resendVerification(resendDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('If your email is registered');

      // Verify no token was created
      expect(mockVerificationTokenRepository.create).not.toHaveBeenCalled();
      // Verify no email was sent
      const emailCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'sendVerificationEmail',
      );
      expect(emailCall).toBeUndefined();
    });

    it('should throw AUTH_USER_ALREADY_VERIFIED error when user is already verified', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'verified@example.com',
      };

      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              _id: { toString: () => 'user123' },
              email: 'verified@example.com',
              status: 'active',
              verifiedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        },
      );

      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.resendVerification(resendDto)).rejects.toMatchObject(
        {
          errorCode: 'AUTH_0009',
        },
      );
    });

    it('should throw AUTH_VERIFICATION_RATE_LIMIT error when rate limit is exceeded', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      // Mock rate limit exceeded (3 attempts already made)
      mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(3);

      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.resendVerification(resendDto)).rejects.toMatchObject(
        {
          errorCode: 'AUTH_0006',
        },
      );
    });

    it('should handle email sending failure gracefully', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      };

      mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(0);

      // Mock email sending failure
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              _id: { toString: () => 'user123' },
              email: 'test@example.com',
              fullName: 'Test User',
              status: 'pending',
            });
          }
          if (method === 'sendVerificationEmail') {
            throw new Error('SMTP connection failed');
          }
          return Promise.resolve(null);
        },
      );

      // Should still return success (email failure is logged but not thrown)
      const result = await service.resendVerification(resendDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('sent to your email');
    });
  });
});
