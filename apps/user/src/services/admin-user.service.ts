import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '@shared/schemas';
import { hashPassword } from '../../../auth/src/utils/password.util';
import { generateStrongPassword } from '../utils/password-generator.util';
import {
  USER_NOT_FOUND,
  USER_ALREADY_BLOCKED,
  USER_NOT_BLOCKED,
} from '@shared/errors/error-codes';
import { error } from '@shared/response';
import {
  AdminResetPasswordDto,
  AdminRevokeSessionsDto,
  AdminBlockUserDto,
  AdminUnblockUserDto,
  AdminResetPasswordResponseDto,
  AdminRevokeSessionsResponseDto,
  AdminBlockUserResponseDto,
  AdminUnblockUserResponseDto,
} from '../dto/admin-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';

/**
 * Service for admin user management operations
 * Handles password resets, session revocation, and account blocking
 */
@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(RABBITMQ_NOTIFICATION_CLIENT)
    private readonly notificationClient: ClientProxy,
  ) {}

  /**
   * Find user by identifier (username or email)
   * @param identifier - Username or email address
   * @returns User document or null
   */
  async findUserByIdentifier(identifier: string): Promise<UserDocument | null> {
    try {
      const normalizedIdentifier = identifier.trim();

      // Use a more robust email detection (basic email regex)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(normalizedIdentifier);

      let query;
      if (isEmail) {
        // For email, use case-insensitive search
        query = { email: normalizedIdentifier.toLowerCase() };
      } else if (Types.ObjectId.isValid(normalizedIdentifier)) {
        // For valid ObjectId, search by _id or username
        query = {
          $or: [
            { _id: new Types.ObjectId(normalizedIdentifier) },
            { username: normalizedIdentifier },
          ],
        };
      } else {
        // For username, use exact match (case-sensitive as per schema)
        query = { username: normalizedIdentifier };
      }

      const user = await this.userModel.findOne(query).exec();

      if (!user) {
        this.logger.warn(
          `User not found with identifier: ${normalizedIdentifier}`,
        );
        throw new HttpException(
          error(USER_NOT_FOUND, 'User not found', {
            identifier: normalizedIdentifier,
          }),
          HttpStatus.NOT_FOUND,
        );
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error finding user by identifier: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reset user password (admin operation)
   * @param identifier - Username or email
   * @param adminUserId - ID of admin performing the operation
   * @param dto - Reset password options
   * @returns Reset password response
   */
  async resetUserPassword(
    identifier: string,
    adminUserId: string,
    dto: AdminResetPasswordDto,
  ): Promise<AdminResetPasswordResponseDto> {
    try {
      const user = await this.findUserByIdentifier(identifier);

      // Determine password - use provided or generate
      const passwordToSet = dto.password || generateStrongPassword(16);
      const isPasswordGenerated = !dto.password;

      // Hash the password
      const hashedPassword = await hashPassword(passwordToSet);

      // Update user record
      const updates: any = {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      };

      if (dto.forceResetOnNextLogin) {
        updates.forcePasswordChange = true;
      }

      // Increment token version to invalidate existing tokens if requested
      let sessionsRevoked = false;
      if (dto.revokeSessions !== false) {
        updates.$inc = { tokenVersion: 1 };
        sessionsRevoked = true;
      }

      // Update user and get the updated document in one operation
      const updatedUser = await this.userModel
        .findByIdAndUpdate(user._id, updates, { new: true })
        .exec();
      const tokenVersion = updatedUser?.tokenVersion || 0;

      // Revoke refresh tokens if requested
      if (sessionsRevoked) {
        await this.revokeUserRefreshTokens(
          user._id.toString(),
          adminUserId,
          dto.reason,
        );
      }

      // Send email notification if requested
      let emailSent = false;
      if (dto.sendEmail !== false) {
        emailSent = await this.sendPasswordResetEmail(
          user,
          passwordToSet,
          isPasswordGenerated,
        );
      }

      // Emit audit event
      this.emitAuditEvent('user.password.reset.admin', {
        adminUserId,
        targetUserId: user._id.toString(),
        targetUserEmail: user.email,
        targetUserUsername: user.username,
        passwordGenerated: isPasswordGenerated,
        forceResetOnNextLogin: dto.forceResetOnNextLogin || false,
        sessionsRevoked,
        emailSent,
        reason: dto.reason,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Admin ${adminUserId} reset password for user ${user._id} (${user.email})`,
      );

      return {
        success: true,
        userId: user._id.toString(),
        generatedPassword: isPasswordGenerated ? passwordToSet : undefined,
        emailSent,
        sessionsRevoked,
        tokenVersion,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error resetting user password: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error('SYS_0001', 'Failed to reset user password'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Revoke all user sessions (admin operation)
   * @param identifier - Username or email
   * @param adminUserId - ID of admin performing the operation
   * @param dto - Revoke sessions options
   * @returns Revoke sessions response
   */
  async revokeUserSessions(
    identifier: string,
    adminUserId: string,
    dto: AdminRevokeSessionsDto,
  ): Promise<AdminRevokeSessionsResponseDto> {
    try {
      const user = await this.findUserByIdentifier(identifier);

      // Increment token version to invalidate all JWTs
      const result = await this.userModel
        .findByIdAndUpdate(
          user._id,
          { $inc: { tokenVersion: 1 } },
          { new: true },
        )
        .exec();

      const tokenVersion = result?.tokenVersion || 0;

      // Revoke refresh tokens
      const tokensRevoked = await this.revokeUserRefreshTokens(
        user._id.toString(),
        adminUserId,
        dto.reason,
      );

      // Emit audit event
      this.emitAuditEvent('user.sessions.revoked.admin', {
        adminUserId,
        targetUserId: user._id.toString(),
        targetUserEmail: user.email,
        targetUserUsername: user.username,
        tokensRevoked,
        tokenVersion,
        reason: dto.reason,
        timestamp: new Date().toISOString(),
      });

      // Optionally send email notification
      if (dto.reason) {
        this.sendSessionsRevokedEmail(user, dto.reason);
      }

      this.logger.log(
        `Admin ${adminUserId} revoked sessions for user ${user._id} (${user.email})`,
      );

      return {
        success: true,
        userId: user._id.toString(),
        tokensRevoked,
        tokenVersion,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Error revoking user sessions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error('SYS_0001', 'Failed to revoke user sessions'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Block user account (admin operation)
   * @param identifier - Username or email
   * @param adminUserId - ID of admin performing the operation
   * @param dto - Block user options
   * @returns Block user response
   */
  async blockUser(
    identifier: string,
    adminUserId: string,
    dto: AdminBlockUserDto,
  ): Promise<AdminBlockUserResponseDto> {
    try {
      const user = await this.findUserByIdentifier(identifier);

      // Check if already blocked
      if (user.blocked) {
        throw new HttpException(
          error(USER_ALREADY_BLOCKED, 'User is already blocked', {
            userId: user._id.toString(),
          }),
          HttpStatus.CONFLICT,
        );
      }

      const blockedAt = new Date();

      // Update user record
      const updates: any = {
        blocked: true,
        blockedAt,
        blockedBy: new Types.ObjectId(adminUserId),
        blockedReason: dto.reason,
        status: 'suspended',
      };

      // Revoke sessions if not soft block and if requested
      let sessionsRevoked = false;
      if (!dto.softBlock && dto.revokeSessions !== false) {
        updates.$inc = { tokenVersion: 1 };
        sessionsRevoked = true;
      }

      await this.userModel.findByIdAndUpdate(user._id, updates).exec();

      // Revoke refresh tokens if needed
      if (sessionsRevoked) {
        await this.revokeUserRefreshTokens(
          user._id.toString(),
          adminUserId,
          dto.reason,
        );
      }

      // Send email notification if requested
      let emailSent = false;
      if (dto.sendEmail !== false) {
        emailSent = await this.sendAccountBlockedEmail(user, dto.reason);
      }

      // Emit audit event
      this.emitAuditEvent('user.blocked.admin', {
        adminUserId,
        targetUserId: user._id.toString(),
        targetUserEmail: user.email,
        targetUserUsername: user.username,
        reason: dto.reason,
        softBlock: dto.softBlock || false,
        sessionsRevoked,
        emailSent,
        blockedAt: blockedAt.toISOString(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Admin ${adminUserId} blocked user ${user._id} (${user.email}): ${dto.reason}`,
      );

      return {
        success: true,
        userId: user._id.toString(),
        blockedAt,
        reason: dto.reason,
        emailSent,
        sessionsRevoked,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error blocking user: ${error.message}`, error.stack);
      throw new HttpException(
        error('SYS_0001', 'Failed to block user'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Unblock user account (admin operation)
   * @param identifier - Username or email
   * @param adminUserId - ID of admin performing the operation
   * @param dto - Unblock user options
   * @returns Unblock user response
   */
  async unblockUser(
    identifier: string,
    adminUserId: string,
    dto: AdminUnblockUserDto,
  ): Promise<AdminUnblockUserResponseDto> {
    try {
      const user = await this.findUserByIdentifier(identifier);

      // Check if user is blocked
      if (!user.blocked) {
        throw new HttpException(
          error(USER_NOT_BLOCKED, 'User is not blocked', {
            userId: user._id.toString(),
          }),
          HttpStatus.CONFLICT,
        );
      }

      // Update user record
      await this.userModel
        .findByIdAndUpdate(user._id, {
          blocked: false,
          blockedAt: null,
          blockedBy: null,
          blockedReason: null,
          status: 'active',
        })
        .exec();

      // Send email notification if requested
      let emailSent = false;
      if (dto.sendEmail !== false) {
        emailSent = await this.sendAccountUnblockedEmail(user);
      }

      // Emit audit event
      this.emitAuditEvent('user.unblocked.admin', {
        adminUserId,
        targetUserId: user._id.toString(),
        targetUserEmail: user.email,
        targetUserUsername: user.username,
        reason: dto.reason,
        emailSent,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Admin ${adminUserId} unblocked user ${user._id} (${user.email})`,
      );

      return {
        success: true,
        userId: user._id.toString(),
        emailSent,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error unblocking user: ${error.message}`, error.stack);
      throw new HttpException(
        error('SYS_0001', 'Failed to unblock user'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * 
   * Note: This method uses fire-and-forget messaging to the auth service.
   * The return value (0) does not reflect the actual number of tokens revoked.
   * For production use, consider implementing RPC calls for accurate counts.
   * 
   * @param userId - User ID
   * @param adminUserId - Admin user ID
   * @param reason - Reason for revocation
   * @returns Number of tokens revoked (always 0 with current fire-and-forget implementation)
   */
  private async revokeUserRefreshTokens(
    userId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<number> {
    try {
      // Use RabbitMQ to communicate with auth service to revoke tokens
      // This is a fire-and-forget operation for now
      this.notificationClient.emit('auth.refresh_tokens.revoke', {
        userId,
        revokedBy: adminUserId,
        reason: reason || 'Admin revoked sessions',
        timestamp: new Date().toISOString(),
      });

      // For now, return 0 as we don't wait for response
      // In production, you might want to use sendRPCRequest for synchronous response
      return 0;
    } catch (error) {
      this.logger.error(
        `Error revoking refresh tokens: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Send password reset email
   * 
   * SECURITY WARNING: This method sends passwords in plaintext via email.
   * While this is for admin-initiated password resets, transmitting passwords
   * through email exposes them to potential interception. For enhanced security,
   * consider using one-time secure links or password reset tokens instead.
   * 
   * Only use this method when:
   * - The organization's security policy allows password transmission via email
   * - Email communication is secured with TLS/SSL
   * - The temporary password should be changed on first login (use forcePasswordChange)
   */
  private async sendPasswordResetEmail(
    user: UserDocument,
    password: string,
    isGenerated: boolean,
  ): Promise<boolean> {
    try {
      this.notificationClient.emit('email.send', {
        to: user.email,
        template: isGenerated
          ? 'admin.reset_password.generated'
          : 'admin.reset_password.provided',
        data: {
          fullName: user.fullName || user.username || user.email,
          username: user.username,
          email: user.email,
          password,
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending password reset email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send sessions revoked email
   */
  private async sendSessionsRevokedEmail(
    user: UserDocument,
    reason: string,
  ): Promise<boolean> {
    try {
      this.notificationClient.emit('email.send', {
        to: user.email,
        template: 'admin.sessions_revoked',
        data: {
          fullName: user.fullName || user.username || user.email,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending sessions revoked email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send account blocked email
   */
  private async sendAccountBlockedEmail(
    user: UserDocument,
    reason: string,
  ): Promise<boolean> {
    try {
      this.notificationClient.emit('email.send', {
        to: user.email,
        template: 'admin.account_blocked',
        data: {
          fullName: user.fullName || user.username || user.email,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending account blocked email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send account unblocked email
   */
  private async sendAccountUnblockedEmail(
    user: UserDocument,
  ): Promise<boolean> {
    try {
      this.notificationClient.emit('email.send', {
        to: user.email,
        template: 'admin.account_unblocked',
        data: {
          fullName: user.fullName || user.username || user.email,
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending account unblocked email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Emit audit event
   */
  private emitAuditEvent(eventName: string, data: any): void {
    try {
      this.notificationClient.emit(eventName, data);
    } catch (error) {
      this.logger.error(
        `Error emitting audit event: ${error.message}`,
        error.stack,
      );
    }
  }
}
