import { Injectable, Inject, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { RabbitMQClient, RABBITMQ_CLIENT } from '@shared/rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS } from '@shared/config/rabbitmq.config';
import { UserRepository } from './repositories/user.repository';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
import { EmailService } from './services/email.service';
import { RegisterDto } from './dto/register.dto';
import { hashPassword } from './utils/password.util';
import { generateVerificationCode, getTokenExpiration } from './utils/token.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationTokenTTL: number;
  private readonly maxTokensPerHour: number;
  private readonly rateLimitWindow: number; // in milliseconds

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
    private readonly userRepository: UserRepository,
    private readonly verificationTokenRepository: VerificationTokenRepository,
    private readonly emailService: EmailService,
  ) {
    this.verificationTokenTTL = parseInt(process.env.VERIFICATION_TOKEN_TTL || '15');
    this.maxTokensPerHour = parseInt(process.env.VERIFICATION_MAX_ATTEMPTS || '3');
    this.rateLimitWindow = parseInt(process.env.VERIFICATION_RATE_LIMIT_WINDOW || '3600000'); // 1 hour default
  }

  async register(data: RegisterDto) {
    const { email, fullName, password } = data;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    
    if (existingUser) {
      if (existingUser.status === 'active' || existingUser.verifiedAt) {
        // User already verified
        throw new ConflictException('Email already registered and verified');
      }

      // User exists but not verified - check rate limiting
      const rateLimitStart = new Date(Date.now() - this.rateLimitWindow);
      const recentTokenCount = await this.verificationTokenRepository.countRecentTokens(
        email,
        rateLimitStart,
      );

      if (recentTokenCount >= this.maxTokensPerHour) {
        throw new BadRequestException(
          `Too many verification attempts. Please try again later.`,
        );
      }

      // Allow resending verification code
      this.logger.log(`Resending verification code for pending user: ${email}`);
    } else {
      // Create new user with pending status
      const hashedPassword = await hashPassword(password);
      
      try {
        await this.userRepository.create({
          email,
          fullName,
          password: hashedPassword,
          status: 'pending',
        });
        
        this.logger.log(`New user created: ${email}`);
      } catch (error) {
        this.logger.error(`Error creating user: ${error.message}`, error.stack);
        if (error.code === 11000) {
          throw new ConflictException('Email already registered');
        }
        throw error;
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = getTokenExpiration(this.verificationTokenTTL);

    // Save verification token
    await this.verificationTokenRepository.create(email, verificationCode, expiresAt);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, fullName, verificationCode);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`, error.stack);
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
      message: 'Registration successful. Please check your email for verification code.',
      data: {
        email,
      },
    };
  }

  async login(data: { email: string; password: string }) {
    // TODO: SECURITY WARNING - Implement actual login logic with password verification
    // This is a MOCK implementation for template purposes only
    // In production:
    // 1. Verify email exists in database
    // 2. Compare password hash using bcrypt
    // 3. Generate actual JWT token with proper signing
    // 4. Set appropriate token expiration
    // 5. Store session/refresh token if needed
    const session = {
      token: 'mock-jwt-token',
      userId: 'mock-user-id',
      expiresIn: 3600,
    };

    // Publish user login event
    await this.rabbitMQClient.publishEvent(
      RABBITMQ_EXCHANGES.EVENTS,
      RABBITMQ_ROUTING_KEYS.AUTH_USER_LOGIN,
      'user.login',
      {
        userId: session.userId,
        timestamp: new Date(),
      },
    );

    return {
      success: true,
      message: 'Login successful',
      session,
    };
  }
}
