import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth.service';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { RefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { LoginDto } from '../src/dto/login.dto';
import { StandardizedException } from '@shared/errors';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

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

describe('AuthService - Login Integration Tests', () => {
  let service: AuthService;
  const mockUserId = new Types.ObjectId().toString();
  const hashedPassword = bcrypt.hashSync('Password123', 10);

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

    // Set JWT environment variables for tests
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('login - successful login', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock RPC to return active user with password
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
              verifiedAt: new Date(),
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.fullName).toBe('Test User');
      expect(result.user.avatarUrl).toBeNull();

      // Verify accessToken is a valid JWT format
      expect(result.accessToken.split('.')).toHaveLength(3);
    });

    it('should call findUserByEmail with includePassword flag', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await service.login(loginDto);

      const findUserCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'findUserByEmail',
      );
      expect(findUserCall).toBeDefined();
      expect(findUserCall[3]).toEqual({
        email: 'test@example.com',
        includePassword: true,
      });
    });

    it('should create a refresh token in database', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await service.login(loginDto);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
      const createCall = mockRefreshTokenRepository.create.mock.calls[0];
      expect(createCall[0]).toBeInstanceOf(Types.ObjectId);
      expect(createCall[1]).toBeDefined(); // token
      expect(createCall[2]).toBeInstanceOf(Date); // expiresAt
    });

    it('should update last login timestamp', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await service.login(loginDto);

      const updateLoginCall = mockRabbitMQClient.sendRPCRequest.mock.calls.find(
        (call) => call[2] === 'updateLastLogin',
      );
      expect(updateLoginCall).toBeDefined();
      expect(updateLoginCall[3]).toEqual({
        userId: mockUserId,
      });
    });

    it('should publish user.login event', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await service.login(loginDto);

      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledTimes(1);
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String), // exchange
        expect.any(String), // routing key
        'user.login',
        expect.objectContaining({
          userId: mockUserId,
          email: 'test@example.com',
        }),
      );
    });
  });

  describe('login - invalid credentials', () => {
    it('should throw AUTH_INVALID_CREDENTIALS error when user does not exist', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: 'AUTH_0002',
          messageKey: 'auth.invalid_credentials',
        }),
      );
    });

    it('should throw AUTH_INVALID_CREDENTIALS when password is incorrect', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: 'AUTH_0002',
          messageKey: 'auth.invalid_credentials',
        }),
      );
    });

    it('should throw AUTH_INVALID_CREDENTIALS when user is not active', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'pending@example.com',
              fullName: 'Pending User',
              password: hashedPassword,
              status: 'pending',
            });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'pending@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        StandardizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        expect.objectContaining({
          errorCode: 'AUTH_0002',
          messageKey: 'auth.invalid_credentials',
        }),
      );
    });

    it('should not reveal whether user exists when credentials are invalid', async () => {
      // Test 1: User doesn't exist
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        },
      );

      const loginDto1: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      const error1Promise = service.login(loginDto1);

      // Test 2: User exists but wrong password
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              password: hashedPassword,
              status: 'active',
            });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto2: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const error2Promise = service.login(loginDto2);

      // Both should fail but error for wrong password should not reveal user existence
      await expect(error1Promise).rejects.toThrow();
      await expect(error2Promise).rejects.toThrow();
    });
  });

  describe('login - user status validation', () => {
    it('should reject login for inactive users', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'inactive@example.com',
              fullName: 'Inactive User',
              password: hashedPassword,
              status: 'inactive',
            });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'inactive@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        StandardizedException,
      );
    });

    it('should reject login for suspended users', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'suspended@example.com',
              fullName: 'Suspended User',
              password: hashedPassword,
              status: 'suspended',
            });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'suspended@example.com',
        password: 'Password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(
        StandardizedException,
      );
    });
  });

  describe('login - token generation', () => {
    it('should generate unique refresh tokens for each login', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result1 = await service.login(loginDto);
      const result2 = await service.login(loginDto);

      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });

    it('should generate access token with correct payload structure', async () => {
      mockRabbitMQClient.sendRPCRequest.mockImplementation(
        (exchange, routingKey, method, params) => {
          if (method === 'findUserByEmail') {
            return Promise.resolve({
              id: mockUserId,
              _id: mockUserId,
              email: 'test@example.com',
              fullName: 'Test User',
              password: hashedPassword,
              status: 'active',
            });
          }
          if (method === 'updateLastLogin') {
            return Promise.resolve({ success: true });
          }
          return Promise.resolve(null);
        },
      );

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await service.login(loginDto);

      // Decode JWT token (without verification for testing)
      const tokenParts = result.accessToken.split('.');
      expect(tokenParts).toHaveLength(3);

      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString(),
      );
      expect(payload.sub).toBe(mockUserId);
      expect(payload.email).toBe('test@example.com');
      expect(payload.type).toBe('access');
      expect(payload.exp).toBeDefined();
    });
  });
});
