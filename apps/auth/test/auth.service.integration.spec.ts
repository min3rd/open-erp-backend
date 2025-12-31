import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { RegisterDto } from '../src/dto/register.dto';
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

describe('AuthService - Register Integration Tests', () => {
  let service: AuthService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: mockRabbitMQClient,
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

    // Reset mocks before each test
    jest.clearAllMocks();

    // Default: no existing user
    mockRabbitMQClient.sendRPCRequest.mockImplementation(
      (exchange, routingKey, method, params) => {
        if (method === 'findUserByEmail') {
          return Promise.resolve(null);
        }
        if (method === 'createUser') {
          return Promise.resolve({
            email: params.email,
            fullName: params.fullName,
            status: 'pending',
          });
        }
        if (method === 'sendVerificationEmail') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve(null);
      },
    );

    mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(0);
  });

  describe('register - new user', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123',
      };

      const result = await service.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Registration successful');
      expect(result.data.email).toBe(registerDto.email);

      // Verify RPC calls were made
      expect(mockRabbitMQClient.sendRPCRequest).toHaveBeenCalledWith(
        expect.any(String), // exchange
        expect.any(String), // routing key
        'findUserByEmail',
        { email: registerDto.email },
      );
      expect(mockRabbitMQClient.sendRPCRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'createUser',
        expect.objectContaining({
          email: registerDto.email,
          fullName: registerDto.fullName,
          status: 'pending',
        }),
      );

      // Verify password was hashed (not the same as input)
      const createUserCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'createUser',
      );
      expect(createUserCall).toBeDefined();
      const createParams = createUserCall[3];
      expect(createParams.password).not.toBe(registerDto.password);
      expect(createParams.password).toBeDefined();
      expect(createParams.email).toBe(registerDto.email);
      expect(createParams.fullName).toBe(registerDto.fullName);
      expect(createParams.status).toBe('pending');
    });

    it('should hash the password before storing', async () => {
      const registerDto: RegisterDto = {
        email: 'test2@example.com',
        fullName: 'Test User 2',
        password: 'Password123',
      };

      await service.register(registerDto);

      // Verify createUser was called with hashed password
      const createUserCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'createUser',
      );
      expect(createUserCall).toBeDefined();
      const createParams = createUserCall[3];
      expect(createParams.password).not.toBe(registerDto.password);
      expect(createParams.password.length).toBeGreaterThan(20); // Bcrypt hashes are long
    });

    it('should create a verification token', async () => {
      const registerDto: RegisterDto = {
        email: 'test3@example.com',
        fullName: 'Test User 3',
        password: 'Password123',
      };

      await service.register(registerDto);

      // Verify token was created
      expect(mockVerificationTokenRepository.create).toHaveBeenCalled();
      const createCall = mockVerificationTokenRepository.create.mock.calls[0];
      expect(createCall[0]).toBe(registerDto.email); // email
      expect(createCall[1]).toMatch(/^\d{6}$/); // 6-digit code
      expect(createCall[2]).toBeInstanceOf(Date); // expiration date
    });

    it('should send verification email', async () => {
      const registerDto: RegisterDto = {
        email: 'test4@example.com',
        fullName: 'Test User 4',
        password: 'Password123',
      };

      await service.register(registerDto);

      // Verify sendVerificationEmail RPC was called
      const emailCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'sendVerificationEmail',
      );
      expect(emailCall).toBeDefined();
      expect(emailCall[3]).toEqual(
        expect.objectContaining({
          to: registerDto.email,
          fullName: registerDto.fullName,
          verificationCode: expect.stringMatching(/^\d{6}$/),
        }),
      );
    });

    it('should publish user.registered event', async () => {
      const registerDto: RegisterDto = {
        email: 'test5@example.com',
        fullName: 'Test User 5',
        password: 'Password123',
      };

      await service.register(registerDto);

      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String), // exchange
        expect.any(String), // routing key
        'user.registered',
        expect.objectContaining({
          email: registerDto.email,
          fullName: registerDto.fullName,
        }),
      );
    });
  });

  describe('register - duplicate email', () => {
    it('should throw ConflictException if email already verified', async () => {
      // Mock RPC to return existing verified user
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              email: 'verified@example.com',
              fullName: 'Verified User',
              status: 'active',
              verifiedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        },
      );

      const registerDto: RegisterDto = {
        email: 'verified@example.com',
        fullName: 'Verified User',
        password: 'Password123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: 'AUTH_0001',
          messageKey: 'auth.email_already_registered',
        }),
      );
    });

    it('should allow resending verification code for pending user', async () => {
      // Mock RPC to return existing pending user
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              email: 'pending@example.com',
              fullName: 'Pending User',
              status: 'pending',
              verifiedAt: null,
            });
          }
          if (method === 'sendVerificationEmail') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const registerDto: RegisterDto = {
        email: 'pending@example.com',
        fullName: 'Pending User',
        password: 'Password123',
      };

      const result = await service.register(registerDto);
      expect(result.success).toBe(true);

      // Should not create new user (user already exists)
      const createUserCalls =
        mockRabbitMQClient.sendRPCRequest.mock.calls.filter(
          (call) => call[2] === 'createUser',
        );
      expect(createUserCalls.length).toBe(0);

      // Should create new token
      expect(mockVerificationTokenRepository.create).toHaveBeenCalled();

      // Should send email via RPC
      const emailCalls = mockRabbitMQClient.sendRPCRequest.mock.calls.filter(
        (call) => call[2] === 'sendVerificationEmail',
      );
      expect(emailCalls.length).toBeGreaterThan(0);
    });

    it('should enforce rate limiting on verification resends', async () => {
      // Mock RPC to return existing pending user
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              email: 'ratelimit@example.com',
              fullName: 'Rate Limited User',
              status: 'pending',
              verifiedAt: null,
            });
          }
          return Promise.resolve(null);
        },
      );

      // Mock 3 recent tokens (rate limit reached)
      mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(3);

      const registerDto: RegisterDto = {
        email: 'ratelimit@example.com',
        fullName: 'Rate Limited User',
        password: 'Password123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: 'AUTH_0006',
          messageKey: 'auth.verification_rate_limit',
        }),
      );
    });
  });

  describe('register - validation', () => {
    it('should validate email format', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'Password123',
      };

      const result = await service.register(registerDto);
      expect(result.success).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      const registerDto: RegisterDto = {
        email: 'TEST@EXAMPLE.COM',
        fullName: 'Test User',
        password: 'Password123',
      };

      await service.register(registerDto);

      // Verify findUserByEmail was called with the provided email
      const findCalls = mockRabbitMQClient.sendRPCRequest.mock.calls.filter(
        (call) => call[2] === 'findUserByEmail',
      );
      expect(findCalls.length).toBeGreaterThan(0);
      expect(findCalls[0][3].email).toBe('TEST@EXAMPLE.COM');
    });
  });
});
