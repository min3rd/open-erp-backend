import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user.service';
import { UserRepository } from '../src/repositories/user.repository';
import { RPCMessage } from '@shared/types/rabbitmq.types';
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

describe('UserService - RPC Handler Tests', () => {
  let service: UserService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
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

    service = moduleRef.get<UserService>(UserService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('handleRPC - updateUserStatus', () => {
    it('should successfully update user status and verifiedAt', async () => {
      const mockUser = {
        _id: { toString: () => 'user123' },
        email: 'test@example.com',
        status: 'pending',
        verifiedAt: null,
      };

      const updatedUser = {
        ...mockUser,
        status: 'active',
        verifiedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.UPDATE_USER_STATUS,
        params: {
          email: 'test@example.com',
          status: 'active',
          verifiedAt: new Date(),
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      const result = await service.handleRPC(message);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          status: 'active',
          verifiedAt: expect.any(Date),
        }),
      );
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

    it('should update status only when verifiedAt is not provided', async () => {
      const mockUser = {
        _id: { toString: () => 'user123' },
        email: 'test@example.com',
        status: 'pending',
      };

      const updatedUser = {
        ...mockUser,
        status: 'active',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.UPDATE_USER_STATUS,
        params: {
          email: 'test@example.com',
          status: 'active',
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      const result = await service.handleRPC(message);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user123', {
        status: 'active',
      });
    });

    it('should throw error when user not found by email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.UPDATE_USER_STATUS,
        params: {
          email: 'nonexistent@example.com',
          status: 'active',
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      await expect(service.handleRPC(message)).rejects.toThrow(
        'User not found with email: nonexistent@example.com',
      );
    });
  });

  describe('handleRPC - updateLastLogin', () => {
    it('should successfully update last login timestamp', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        lastLoginAt: new Date(),
      };

      mockUserRepository.updateLastLogin.mockResolvedValue(mockUser);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.UPDATE_LAST_LOGIN,
        params: {
          userId: 'user123',
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      const result = await service.handleRPC(message);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(
        'user123',
      );
    });

    it('should throw error when user not found by id', async () => {
      mockUserRepository.updateLastLogin.mockResolvedValue(null);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.UPDATE_LAST_LOGIN,
        params: {
          userId: 'nonexistent-id',
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      await expect(service.handleRPC(message)).rejects.toThrow(
        'User not found with id: nonexistent-id',
      );
    });
  });

  describe('handleRPC - existing methods', () => {
    it('should handle findUserByEmail RPC method', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const message: RPCMessage<any> = {
        method: RPC_METHODS.USER.FIND_USER_BY_EMAIL,
        params: {
          email: 'test@example.com',
        },
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      const result = await service.handleRPC(message);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
        undefined,
      );
    });

    it('should throw error for unknown RPC method', async () => {
      const message: RPCMessage<any> = {
        method: 'unknownMethod',
        params: {},
        correlationId: 'test-correlation-id',
        messageId: 'test-message-id',
        timestamp: Date.now(),
      };

      await expect(service.handleRPC(message)).rejects.toThrow(
        'Unknown RPC method: unknownMethod',
      );
    });
  });
});
