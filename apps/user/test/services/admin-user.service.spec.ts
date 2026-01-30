import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdminUserService } from '../../src/services/admin-user.service';
import { User, UserDocument } from '@shared/schemas';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';
import {
  USER_NOT_FOUND,
  USER_ALREADY_BLOCKED,
  USER_NOT_BLOCKED,
} from '@shared/errors/error-codes';
import * as passwordUtil from '../../../auth/src/utils/password.util';
import * as passwordGenerator from '../../src/utils/password-generator.util';

// Mock the password utilities
jest.mock('../../../auth/src/utils/password.util');
jest.mock('../../src/utils/password-generator.util');

describe('AdminUserService', () => {
  let service: AdminUserService;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let notificationClient: any;

  const mockUserId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const adminUserId = new Types.ObjectId('507f1f77bcf86cd799439012').toString();

  const mockUser = {
    _id: mockUserId,
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    status: 'active',
    blocked: false,
    tokenVersion: 0,
    save: jest.fn(),
    toJSON: () => ({
      id: mockUserId.toString(),
      username: 'testuser',
      email: 'test@example.com',
    }),
  };

  beforeEach(async () => {
    const mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const mockNotificationClient = {
      emit: jest.fn(),
      sendRPCRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: RABBITMQ_NOTIFICATION_CLIENT,
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    service = module.get<AdminUserService>(AdminUserService);
    userModel = module.get(getModelToken(User.name));
    notificationClient = module.get(RABBITMQ_NOTIFICATION_CLIENT);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findUserByIdentifier', () => {
    it('should find user by email', async () => {
      const identifier = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findUserByIdentifier(identifier);

      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: identifier.toLowerCase(),
      });
    });

    it('should find user by username', async () => {
      const identifier = 'testuser';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findUserByIdentifier(identifier);

      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({ username: identifier });
    });

    it('should find user by username even if it contains @ (non-email format)', async () => {
      const identifier = 'user@company'; // Contains @ but not a valid email
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findUserByIdentifier(identifier);

      expect(result).toEqual(mockUser);
      // Should search by username, not email, because it doesn't match email regex
      expect(userModel.findOne).toHaveBeenCalledWith({ username: identifier });
    });

    it('should trim whitespace from identifier', async () => {
      const identifier = '  test@example.com  ';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      await service.findUserByIdentifier(identifier);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: identifier.trim().toLowerCase(),
      });
    });

    it('should throw USER_NOT_FOUND if user does not exist', async () => {
      const identifier = 'nonexistent@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findUserByIdentifier(identifier)).rejects.toThrow(
        HttpException,
      );
      await expect(
        service.findUserByIdentifier(identifier),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: expect.objectContaining({
            code: USER_NOT_FOUND,
          }),
        }),
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('resetUserPassword', () => {
    const dto = {
      password: 'NewPassword123!',
      forceResetOnNextLogin: true,
      sendEmail: true,
      revokeSessions: true,
      reason: 'Admin requested password reset',
    };

    beforeEach(() => {
      (passwordUtil.hashPassword as jest.Mock).mockResolvedValue(
        'hashed-password',
      );
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUser, tokenVersion: 1 }),
      } as any);
    });

    it('should reset password with provided password', async () => {
      const result = await service.resetUserPassword(
        'test@example.com',
        adminUserId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId.toString());
      expect(result.generatedPassword).toBeUndefined();
      expect(result.emailSent).toBe(true);
      expect(result.sessionsRevoked).toBe(true);
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(dto.password);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(notificationClient.emit).toHaveBeenCalledWith(
        'email.send',
        expect.any(Object),
      );
    });

    it('should generate password if not provided', async () => {
      const generatedPassword = 'GeneratedPass123!';
      (passwordGenerator.generateStrongPassword as jest.Mock).mockReturnValue(
        generatedPassword,
      );

      const dtoWithoutPassword = { ...dto, password: undefined };
      const result = await service.resetUserPassword(
        'test@example.com',
        adminUserId,
        dtoWithoutPassword,
      );

      expect(result.success).toBe(true);
      expect(result.generatedPassword).toBe(generatedPassword);
      expect(passwordGenerator.generateStrongPassword).toHaveBeenCalledWith(16);
      expect(passwordUtil.hashPassword).toHaveBeenCalledWith(generatedPassword);
    });

    it('should not revoke sessions if revokeSessions is false', async () => {
      const dtoNoRevoke = { ...dto, revokeSessions: false };
      const result = await service.resetUserPassword(
        'test@example.com',
        adminUserId,
        dtoNoRevoke,
      );

      expect(result.sessionsRevoked).toBe(false);
    });

    it('should not send email if sendEmail is false', async () => {
      const dtoNoEmail = { ...dto, sendEmail: false };
      const result = await service.resetUserPassword(
        'test@example.com',
        adminUserId,
        dtoNoEmail,
      );

      expect(result.emailSent).toBe(false);
    });

    it('should emit audit event', async () => {
      await service.resetUserPassword('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'user.password.reset.admin',
        expect.objectContaining({
          adminUserId,
          targetUserId: mockUserId.toString(),
          targetUserEmail: mockUser.email,
          targetUserUsername: mockUser.username,
        }),
      );
    });
  });

  describe('revokeUserSessions', () => {
    const dto = {
      revokeRefreshTokens: true,
      revokeAllDevices: true,
      reason: 'Security concern',
    };

    beforeEach(() => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUser, tokenVersion: 1 }),
      } as any);
    });

    it('should revoke all sessions', async () => {
      const result = await service.revokeUserSessions(
        'test@example.com',
        adminUserId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId.toString());
      expect(result.tokenVersion).toBe(1);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { $inc: { tokenVersion: 1 } },
        { new: true },
      );
    });

    it('should emit audit event', async () => {
      await service.revokeUserSessions('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'user.sessions.revoked.admin',
        expect.objectContaining({
          adminUserId,
          targetUserId: mockUserId.toString(),
          reason: dto.reason,
        }),
      );
    });

    it('should emit refresh token revocation event', async () => {
      await service.revokeUserSessions('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'auth.refresh_tokens.revoke',
        expect.objectContaining({
          userId: mockUserId.toString(),
          revokedBy: adminUserId,
        }),
      );
    });
  });

  describe('blockUser', () => {
    const dto = {
      reason: 'Violation of terms of service',
      softBlock: false,
      revokeSessions: true,
      sendEmail: true,
    };

    beforeEach(() => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
    });

    it('should block user successfully', async () => {
      const result = await service.blockUser(
        'test@example.com',
        adminUserId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId.toString());
      expect(result.reason).toBe(dto.reason);
      expect(result.emailSent).toBe(true);
      expect(result.sessionsRevoked).toBe(true);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        expect.objectContaining({
          blocked: true,
          blockedReason: dto.reason,
          status: 'suspended',
        }),
      );
    });

    it('should throw USER_ALREADY_BLOCKED if user is already blocked', async () => {
      const blockedUser = { ...mockUser, blocked: true };
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(blockedUser),
      } as any);

      await expect(
        service.blockUser('test@example.com', adminUserId, dto),
      ).rejects.toThrow(HttpException);
      await expect(
        service.blockUser('test@example.com', adminUserId, dto),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: expect.objectContaining({
            code: USER_ALREADY_BLOCKED,
          }),
        }),
        status: HttpStatus.CONFLICT,
      });
    });

    it('should not revoke sessions if softBlock is true', async () => {
      const softBlockDto = { ...dto, softBlock: true };
      const result = await service.blockUser(
        'test@example.com',
        adminUserId,
        softBlockDto,
      );

      expect(result.sessionsRevoked).toBe(false);
    });

    it('should emit audit event', async () => {
      await service.blockUser('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'user.blocked.admin',
        expect.objectContaining({
          adminUserId,
          targetUserId: mockUserId.toString(),
          reason: dto.reason,
        }),
      );
    });

    it('should send email notification', async () => {
      await service.blockUser('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: mockUser.email,
          template: 'admin.account_blocked',
        }),
      );
    });
  });

  describe('unblockUser', () => {
    const dto = {
      reason: 'Issue resolved',
      sendEmail: true,
    };

    const blockedUser = {
      ...mockUser,
      blocked: true,
      blockedAt: new Date(),
      blockedReason: 'Previous violation',
    };

    beforeEach(() => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(blockedUser),
      } as any);
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
    });

    it('should unblock user successfully', async () => {
      const result = await service.unblockUser(
        'test@example.com',
        adminUserId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId.toString());
      expect(result.emailSent).toBe(true);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        expect.objectContaining({
          blocked: false,
          blockedAt: null,
          blockedBy: null,
          blockedReason: null,
          status: 'active',
        }),
      );
    });

    it('should throw USER_NOT_BLOCKED if user is not blocked', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(
        service.unblockUser('test@example.com', adminUserId, dto),
      ).rejects.toThrow(HttpException);
      await expect(
        service.unblockUser('test@example.com', adminUserId, dto),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          error: expect.objectContaining({
            code: USER_NOT_BLOCKED,
          }),
        }),
        status: HttpStatus.CONFLICT,
      });
    });

    it('should emit audit event', async () => {
      await service.unblockUser('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'user.unblocked.admin',
        expect.objectContaining({
          adminUserId,
          targetUserId: mockUserId.toString(),
          reason: dto.reason,
        }),
      );
    });

    it('should send email notification', async () => {
      await service.unblockUser('test@example.com', adminUserId, dto);

      expect(notificationClient.emit).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: mockUser.email,
          template: 'admin.account_unblocked',
        }),
      );
    });

    it('should not send email if sendEmail is false', async () => {
      const dtoNoEmail = { ...dto, sendEmail: false };
      const result = await service.unblockUser(
        'test@example.com',
        adminUserId,
        dtoNoEmail,
      );

      expect(result.emailSent).toBe(false);
    });
  });
});
