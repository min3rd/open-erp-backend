import { Injectable, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
import {
  ErrorFactory,
  AUTH_EMAIL_ALREADY_REGISTERED,
  AUTH_VERIFICATION_RATE_LIMIT,
  AUTH_INVALID_CREDENTIALS,
  AUTH_VERIFICATION_CODE_EXPIRED,
  AUTH_VERIFICATION_CODE_INVALID,
  AUTH_USER_ALREADY_VERIFIED,
  DB_DUPLICATE_KEY,
  USER_NOT_FOUND,
} from '@shared/errors';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { hashPassword, comparePassword } from './utils/password.util';
import {
  generateVerificationCode,
  getTokenExpiration,
  generateAccessToken,
  generateRefreshToken,
  calculateExpirationDate,
} from './utils/token.util';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationTokenTTL: number;
  private readonly maxTokensPerHour: number;
  private readonly rateLimitWindow: number; // in milliseconds
  private readonly jwtSecret: string;
  private readonly jwtAccessExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly verificationTokenRepository: VerificationTokenRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {
    this.verificationTokenTTL = parseInt(
      process.env.VERIFICATION_TOKEN_TTL || '15',
    );
    this.maxTokensPerHour = parseInt(
      process.env.VERIFICATION_MAX_ATTEMPTS || '3',
    );
    this.rateLimitWindow = parseInt(
      process.env.VERIFICATION_RATE_LIMIT_WINDOW || '3600000',
    ); // 1 hour default

    // JWT configuration - fail fast if not set in production
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET environment variable must be set in production',
      );
    }
    this.jwtSecret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  async register(data: RegisterDto) {
    const { email, fullName, password } = data;

    // Check if user already exists via RPC to user service
    const existingUser = await this.rabbitMQClient.sendRPCRequest<
      { email: string },
      any
    >(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'findUserByEmail',
      { email },
    );

    if (existingUser) {
      if (existingUser.status === 'active' || existingUser.verifiedAt) {
        // User already verified
        throw ErrorFactory.createError({
          code: AUTH_EMAIL_ALREADY_REGISTERED,
        });
      }

      // User exists but not verified - check rate limiting
      const rateLimitStart = new Date(Date.now() - this.rateLimitWindow);
      const recentTokenCount =
        await this.verificationTokenRepository.countRecentTokens(
          email,
          rateLimitStart,
        );

      if (recentTokenCount >= this.maxTokensPerHour) {
        throw ErrorFactory.createError({
          code: AUTH_VERIFICATION_RATE_LIMIT,
          details: {
            maxAttempts: this.maxTokensPerHour,
            windowMinutes: this.rateLimitWindow / 60000,
          },
        });
      }

      // Allow resending verification code
      this.logger.log(`Resending verification code for pending user: ${email}`);
    } else {
      // Create new user via RPC to user service
      const hashedPassword = await hashPassword(password);

      try {
        await this.rabbitMQClient.sendRPCRequest<any, any>(
          RABBITMQ_EXCHANGES.RPC,
          RABBITMQ_ROUTING_KEYS.RPC_USER,
          'createUser',
          {
            email,
            username: email,
            fullName,
            password: hashedPassword,
            status: 'pending',
          },
        );

        this.logger.log(`New user created: ${email}`);
      } catch (error) {
        this.logger.error(`Error creating user: ${error.message}`, error.stack);
        if (error.code === 11000 || error.message?.includes('duplicate')) {
          throw ErrorFactory.createError({
            code: DB_DUPLICATE_KEY,
            details: { field: 'email' },
          });
        }
        throw error;
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = getTokenExpiration(this.verificationTokenTTL);

    // Save verification token
    await this.verificationTokenRepository.create(
      email,
      verificationCode,
      expiresAt,
    );

    // Send verification email via RPC to notification service
    try {
      await this.rabbitMQClient.sendRPCRequest<any, any>(
        RABBITMQ_EXCHANGES.RPC,
        RABBITMQ_ROUTING_KEYS.RPC_NOTIFICATION,
        'sendVerificationEmail',
        {
          to: email,
          fullName,
          verificationCode,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error.message}`,
        error.stack,
      );
      // NOTE: Email sending failure is logged but doesn't block registration.
      // User record is created and can request a new verification code.
      // In production, consider:
      // - Implementing retry queue for failed emails
      // - Setting up alerts for email service failures
      // - Allowing users to resend verification code through separate endpoint
    }

    // Publish user registered event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.AUTH_USER_REGISTERED,
      'user.registered',
      {
        email,
        fullName,
        timestamp: new Date(),
      },
    );

    // Log structured event
    this.logger.log({
      event: 'user.registered',
      email,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message:
        'Registration successful. Please check your email for verification code.',
      data: {
        email,
      },
    };
  }

  async login(data: LoginDto) {
    const { email, password } = data;

    // Get user via RPC to user service (include password field)
    const user = await this.rabbitMQClient.sendRPCRequest<
      { email: string; includePassword: boolean },
      any
    >(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'findUserByEmail',
      { email, includePassword: true },
    );

    // Check if user exists - use AUTH_INVALID_CREDENTIALS to prevent user enumeration
    if (!user) {
      throw ErrorFactory.createError({
        code: AUTH_INVALID_CREDENTIALS,
      });
    }
    this.logger.log(`User found for login: ${JSON.stringify(user)}`);
    // Check if user account is active
    if (user.status !== 'active') {
      throw ErrorFactory.createError({
        code: AUTH_INVALID_CREDENTIALS,
        details: {
          reason: 'Account not active. Please verify your email first.',
        },
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw ErrorFactory.createError({
        code: AUTH_INVALID_CREDENTIALS,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(
      user.id.toString(),
      user.email,
      this.jwtSecret,
      this.jwtAccessExpiresIn,
    );

    const refreshTokenValue = generateRefreshToken();
    const refreshTokenExpiresAt = calculateExpirationDate(
      this.jwtRefreshExpiresIn,
    );

    // Save refresh token to database
    await this.refreshTokenRepository.create(
      new Types.ObjectId(user.id),
      refreshTokenValue,
      refreshTokenExpiresAt,
    );

    // Update last login timestamp via RPC
    await this.rabbitMQClient.sendRPCRequest<any, any>(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'updateLastLogin',
      { userId: user.id.toString() },
    );

    // Publish user login event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.AUTH_USER_LOGIN,
      'user.login',
      {
        userId: user.id.toString(),
        email: user.email,
        timestamp: new Date(),
      },
    );

    // Log structured event
    this.logger.log({
      event: 'user.login',
      userId: user.id.toString(),
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        email: user.email,
        fullName: user.fullName || user.username,
        avatarUrl: user.avatarUrl || null,
      },
    };
  }

  async verifyEmail(data: VerifyEmailDto) {
    const { email, code } = data;

    // Get user via RPC to user service
    const user = await this.rabbitMQClient.sendRPCRequest<
      { email: string },
      any
    >(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'findUserByEmail',
      { email },
    );

    // Check if user exists
    if (!user) {
      this.logger.warn(`Verification attempt for non-existent user: ${email}`);
      throw ErrorFactory.createError({
        code: USER_NOT_FOUND,
      });
    }

    // Check if user is already verified
    if (user.status === 'active' || user.verifiedAt) {
      this.logger.log(`User already verified: ${email}`);
      throw ErrorFactory.createError({
        code: AUTH_USER_ALREADY_VERIFIED,
      });
    }

    // Find valid verification token
    const verificationToken =
      await this.verificationTokenRepository.findValidToken(email, code);

    if (!verificationToken) {
      this.logger.warn(`Invalid or expired verification code for: ${email}`);

      // Check if there's any token (to differentiate between invalid and expired)
      const anyToken = await this.verificationTokenRepository.findToken(
        email,
        code,
      );

      throw ErrorFactory.createError({
        code: anyToken
          ? AUTH_VERIFICATION_CODE_EXPIRED
          : AUTH_VERIFICATION_CODE_INVALID,
        details: {
          email,
        },
      });
    }

    // Mark token as used (single-use)
    await this.verificationTokenRepository.markAsUsed(
      verificationToken._id.toString(),
    );

    // Update user status to 'active' via RPC
    await this.rabbitMQClient.sendRPCRequest<any, any>(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'updateUserStatus',
      {
        email,
        status: 'active',
        verifiedAt: new Date(),
      },
    );
    this.logger.log(`User verified: ${JSON.stringify(user)}`);
    // Publish user.verified event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.AUTH_USER_VERIFIED,
      'user.verified',
      {
        userId: user.id.toString(),
        email,
        timestamp: new Date(),
      },
    );

    // Log structured event
    this.logger.log({
      event: 'user.verified',
      userId: user.id.toString(),
      email,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {
        userId: user.id.toString(),
        email,
      },
    };
  }

  async resendVerification(data: ResendVerificationDto) {
    const { email } = data;

    // Get user via RPC to user service
    const user = await this.rabbitMQClient.sendRPCRequest<
      { email: string },
      any
    >(
      RABBITMQ_EXCHANGES.RPC,
      RABBITMQ_ROUTING_KEYS.RPC_USER,
      'findUserByEmail',
      { email },
    );

    // Soft response for security - don't reveal if user exists
    // But we need to check internally
    if (!user) {
      this.logger.warn(`Resend verification for non-existent user: ${email}`);
      // Return success to avoid user enumeration
      return {
        success: true,
        message:
          'If your email is registered and not verified, you will receive a verification code.',
      };
    }

    // Check if user is already verified
    if (user.status === 'active' || user.verifiedAt) {
      this.logger.log(
        `Resend verification attempted for already verified user: ${email}`,
      );
      throw ErrorFactory.createError({
        code: AUTH_USER_ALREADY_VERIFIED,
      });
    }

    // Check rate limiting
    const rateLimitStart = new Date(Date.now() - this.rateLimitWindow);
    const recentTokenCount =
      await this.verificationTokenRepository.countRecentTokens(
        email,
        rateLimitStart,
      );

    if (recentTokenCount >= this.maxTokensPerHour) {
      throw ErrorFactory.createError({
        code: AUTH_VERIFICATION_RATE_LIMIT,
        details: {
          maxAttempts: this.maxTokensPerHour,
          windowMinutes: this.rateLimitWindow / 60000,
          remainingAttempts: 0,
        },
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = getTokenExpiration(this.verificationTokenTTL);

    // Save verification token
    await this.verificationTokenRepository.create(
      email,
      verificationCode,
      expiresAt,
    );

    // Send verification email via RPC to notification service
    try {
      await this.rabbitMQClient.sendRPCRequest<any, any>(
        RABBITMQ_EXCHANGES.RPC,
        RABBITMQ_ROUTING_KEYS.RPC_NOTIFICATION,
        'sendVerificationEmail',
        {
          to: email,
          fullName: user.fullName || user.username,
          verificationCode,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email: ${error.message}`,
        error.stack,
      );
      // Email sending failure is logged but doesn't block the request
    }

    // Log structured event
    this.logger.log({
      event: 'verification.resent',
      email,
      attemptsRemaining: this.maxTokensPerHour - recentTokenCount - 1,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Verification code has been sent to your email.',
      data: {
        email,
        attemptsRemaining: this.maxTokensPerHour - recentTokenCount - 1,
      },
    };
  }
}
