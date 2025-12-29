import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/auth.service';
import { UserRepository } from '../src/repositories/user.repository';
import { VerificationTokenRepository } from '../src/repositories/verification-token.repository';
import { EmailService } from '../src/services/email.service';
import { RegisterDto } from '../src/dto/register.dto';

// Mock RabbitMQ client
const mockRabbitMQClient = {
  publishEvent: jest.fn().mockResolvedValue(undefined),
};

// Mock Email service
const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
};

// Mock User Repository
const mockUserRepository = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateVerificationStatus: jest.fn(),
};

// Mock Verification Token Repository
const mockVerificationTokenRepository = {
  create: jest.fn().mockResolvedValue({ token: '123456' }),
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
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: VerificationTokenRepository,
          useValue: mockVerificationTokenRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      email: 'test@example.com',
      fullName: 'Test User',
      status: 'pending',
    });
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

      // Verify repository methods were called
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockUserRepository.create).toHaveBeenCalled();
      
      // Verify password was hashed (not the same as input)
      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(registerDto.password);
      expect(createCall.password).toBeDefined();
      expect(createCall.email).toBe(registerDto.email);
      expect(createCall.fullName).toBe(registerDto.fullName);
      expect(createCall.status).toBe('pending');
    });

    it('should hash the password before storing', async () => {
      const registerDto: RegisterDto = {
        email: 'test2@example.com',
        fullName: 'Test User 2',
        password: 'Password123',
      };

      await service.register(registerDto);

      // Verify create was called with hashed password
      expect(mockUserRepository.create).toHaveBeenCalled();
      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(registerDto.password);
      expect(createCall.password.length).toBeGreaterThan(20); // Bcrypt hashes are long
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

      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.fullName,
        expect.stringMatching(/^\d{6}$/), // 6-digit code
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
      // Mock existing verified user
      mockUserRepository.findByEmail.mockResolvedValue({
        email: 'verified@example.com',
        fullName: 'Verified User',
        status: 'active',
        verifiedAt: new Date(),
      });

      const registerDto: RegisterDto = {
        email: 'verified@example.com',
        fullName: 'Verified User',
        password: 'Password123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already registered and verified');
    });

    it('should allow resending verification code for pending user', async () => {
      // Mock existing pending user
      mockUserRepository.findByEmail.mockResolvedValue({
        email: 'pending@example.com',
        fullName: 'Pending User',
        status: 'pending',
        verifiedAt: null,
      });

      const registerDto: RegisterDto = {
        email: 'pending@example.com',
        fullName: 'Pending User',
        password: 'Password123',
      };

      const result = await service.register(registerDto);
      expect(result.success).toBe(true);

      // Should not create new user
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      
      // Should create new token
      expect(mockVerificationTokenRepository.create).toHaveBeenCalled();
      
      // Should send email
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should enforce rate limiting on verification resends', async () => {
      // Mock existing pending user
      mockUserRepository.findByEmail.mockResolvedValue({
        email: 'ratelimit@example.com',
        fullName: 'Rate Limited User',
        status: 'pending',
        verifiedAt: null,
      });

      // Mock 3 recent tokens (rate limit reached)
      mockVerificationTokenRepository.countRecentTokens.mockResolvedValue(3);

      const registerDto: RegisterDto = {
        email: 'ratelimit@example.com',
        fullName: 'Rate Limited User',
        password: 'Password123',
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(registerDto)).rejects.toThrow('Too many verification attempts');
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

      // Verify findByEmail was called with lowercase email
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
    });
  });
});
