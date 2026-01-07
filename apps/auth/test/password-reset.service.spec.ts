import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { ForgotPasswordDto } from '../src/dto/forgot-password.dto';
import { ResetPasswordDto } from '../src/dto/reset-password.dto';
import { StandardizedException } from '@shared/errors';
import { hashToken } from '../src/utils/token.util';

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
    userId: 'mock-user-id',
    token: 'mock-refresh-token',
    expiresAt: new Date(),
  }),
  findByToken: jest.fn(),
  revokeToken: jest.fn(),
};

// Mock Password Reset Token Repository
const mockPasswordResetTokenRepository = {
  create: jest.fn().mockResolvedValue({
    email: 'test@example.com',
    tokenHash: 'mock-token-hash',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  }),
  findValidToken: jest.fn(),
  findToken: jest.fn(),
  markAsUsed: jest.fn(),
  countRecentTokens: jest.fn().mockResolvedValue(0),
};

describe('AuthService - Password Reset Tests', () => {
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

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should return success even if user does not exist (prevent enumeration)', async () => {
      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain(
        'If your email is registered, you will receive a password reset link',
      );
      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
    });

    it('should create reset token and send email when user exists', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce(mockUser);
      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce({
        success: true,
      });

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.success).toBe(true);
      expect(mockPasswordResetTokenRepository.create).toHaveBeenCalled();
      expect(mockRabbitMQClient.sendRPCRequest).toHaveBeenCalledWith(
        'erp.rpc',
        'rpc.notification',
        'sendPasswordResetEmail',
        expect.objectContaining({
          to: mockUser.email,
          fullName: mockUser.fullName,
          resetLink: expect.stringContaining('/auth/reset-password?token='),
        }),
      );
    });

    it('should enforce rate limiting', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce(mockUser);
      mockPasswordResetTokenRepository.countRecentTokens.mockResolvedValueOnce(
        2,
      );

      await expect(service.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        StandardizedException,
      );
    });
  });

  describe('validateResetToken', () => {
    it('should return invalid for empty token', async () => {
      const result = await service.validateResetToken('');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token is required');
    });

    it('should return invalid for non-existent token', async () => {
      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(null);

      const result = await service.validateResetToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token');
    });

    it('should return invalid for expired token', async () => {
      const expiredToken = {
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        expiredToken,
      );

      const result = await service.validateResetToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token has expired');
    });

    it('should return invalid for already used token', async () => {
      const usedToken = {
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: new Date(),
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        usedToken,
      );

      const result = await service.validateResetToken('used-token');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token has already been used');
    });

    it('should return valid for a valid token', async () => {
      const validToken = {
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        validToken,
      );

      const result = await service.validateResetToken('valid-token');

      expect(result.valid).toBe(true);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-token',
      password: 'NewPassword123!',
    };

    it('should throw error for invalid token', async () => {
      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        StandardizedException,
      );
    });

    it('should throw error for expired token', async () => {
      const expiredToken = {
        _id: 'token123',
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        expiredToken,
      );

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        StandardizedException,
      );
    });

    it('should throw error for already used token', async () => {
      const usedToken = {
        _id: 'token123',
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: new Date(),
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        usedToken,
      );

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        StandardizedException,
      );
    });

    it('should successfully reset password with valid token', async () => {
      const validToken = {
        _id: 'token123',
        email: 'test@example.com',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        usedAt: null,
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockPasswordResetTokenRepository.findToken.mockResolvedValueOnce(
        validToken,
      );
      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce(mockUser);
      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce({
        success: true,
      });
      mockRabbitMQClient.sendRPCRequest.mockResolvedValueOnce({
        success: true,
      });

      const result = await service.resetPassword(resetPasswordDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password has been reset successfully');
      expect(mockPasswordResetTokenRepository.markAsUsed).toHaveBeenCalledWith(
        'token123',
      );
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        'erp.events',
        'auth.user.password.changed',
        'user.password.changed',
        expect.any(Object),
      );
    });
  });

  describe('Token generation and hashing', () => {
    it('should generate different tokens each time', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockRabbitMQClient.sendRPCRequest.mockResolvedValue(mockUser);

      // Call twice to get two tokens
      await service.forgotPassword({ email: 'test@example.com' });
      const firstCallArgs =
        mockPasswordResetTokenRepository.create.mock.calls[0];

      jest.clearAllMocks();
      mockRabbitMQClient.sendRPCRequest.mockResolvedValue(mockUser);

      await service.forgotPassword({ email: 'test@example.com' });
      const secondCallArgs =
        mockPasswordResetTokenRepository.create.mock.calls[0];

      // Token hashes should be different
      expect(firstCallArgs[1]).not.toEqual(secondCallArgs[1]);
    });
  });
});
