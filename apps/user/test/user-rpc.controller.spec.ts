import { Test, TestingModule } from '@nestjs/testing';
import { UserRpcController } from '../src/user-rpc.controller';
import { UserRepository } from '../src/repositories/user.repository';
import { RPC_METHODS, EVENT_NAMES } from '@shared/constants/message.constants';

// Mock RabbitMQ client
const mockRabbitMQClient = {
  publishEvent: jest.fn().mockResolvedValue(undefined),
  sendRPCRequest: jest.fn(),
};

// Mock User Repository
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateLastLogin: jest.fn(),
};

describe('UserRpcController', () => {
  let controller: UserRpcController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UserRpcController],
      providers: [
        {
          provide: 'RABBITMQ_CLIENT',
          useValue: mockRabbitMQClient,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = moduleRef.get<UserRpcController>(UserRpcController);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should call repository findById with correct params', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await controller.getUser({ userId: 'user123' });

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user123');
    });
  });

  describe('getUserByEmail', () => {
    it('should call repository findByEmail with correct params', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await controller.getUserByEmail({
        email: 'test@example.com',
        includePassword: false,
      });

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
        false,
      );
    });
  });

  describe('createUser', () => {
    it('should create user and publish event', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await controller.createUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        EVENT_NAMES.USER.CREATED,
        mockUser,
      );
    });

    it('should throw error if creation fails', async () => {
      const error = new Error('Creation failed');
      mockUserRepository.create.mockRejectedValue(error);

      await expect(
        controller.createUser({
          username: 'testuser',
          email: 'test@example.com',
        }),
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status and publish event', async () => {
      const mockUser = {
        _id: { toString: () => 'user123' },
        email: 'test@example.com',
        status: 'pending',
      };
      const updatedUser = { ...mockUser, status: 'active' };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUserStatus({
        email: 'test@example.com',
        status: 'active',
      });

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith('user123', {
        status: 'active',
      });
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        EVENT_NAMES.USER.UPDATED,
        expect.objectContaining({
          userId: 'user123',
          email: 'test@example.com',
          status: 'active',
        }),
      );
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        controller.updateUserStatus({
          email: 'nonexistent@example.com',
          status: 'active',
        }),
      ).rejects.toThrow('User not found with email: nonexistent@example.com');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        lastLoginAt: new Date(),
      };

      mockUserRepository.updateLastLogin.mockResolvedValue(mockUser);

      const result = await controller.updateLastLogin({ userId: 'user123' });

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        'user123',
      );
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.updateLastLogin.mockResolvedValue(null);

      await expect(
        controller.updateLastLogin({ userId: 'nonexistent-id' }),
      ).rejects.toThrow('User not found with id: nonexistent-id');
    });
  });

  describe('updateUserPassword', () => {
    it('should update user password and publish event', async () => {
      const mockUser = {
        _id: { toString: () => 'user123' },
        email: 'test@example.com',
      };
      const updatedUser = { ...mockUser, password: 'newHashedPassword' };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUserPassword({
        email: 'test@example.com',
        password: 'newHashedPassword',
      });

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith('user123', {
        password: 'newHashedPassword',
      });
      expect(mockRabbitMQClient.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        EVENT_NAMES.USER.UPDATED,
        expect.objectContaining({
          userId: 'user123',
          email: 'test@example.com',
          passwordChanged: true,
        }),
      );
    });
  });
});
