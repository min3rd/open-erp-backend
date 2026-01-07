import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserManagementService } from '../../src/services/user-management.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { UserTenantRepository } from '../../src/repositories/user-tenant.repository';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let userRepository: jest.Mocked<UserRepository>;
  let userTenantRepository: jest.Mocked<UserTenantRepository>;

  const mockUser = {
    _id: { toString: () => 'user123' },
    username: 'testuser',
    email: 'test@example.com',
    status: 'active',
    toJSON: () => ({ id: 'user123', username: 'testuser', email: 'test@example.com' }),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      searchUsers: jest.fn(),
    };

    const mockUserTenantRepository = {
      findUserTenants: jest.fn(),
      listTenantMembers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: UserTenantRepository,
          useValue: mockUserTenantRepository,
        },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    userRepository = module.get(UserRepository);
    userTenantRepository = module.get(UserTenantRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser as any);

      const result = await service.createUser(createDto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.createUser(createDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if username already exists', async () => {
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(mockUser as any);

      await expect(service.createUser(createDto)).rejects.toThrow(BadRequestException);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should return user without memberships', async () => {
      userRepository.findById.mockResolvedValue(mockUser as any);

      const result = await service.findUserById('user123', false);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user123');
      expect(userTenantRepository.findUserTenants).not.toHaveBeenCalled();
    });

    it('should return user with memberships when requested', async () => {
      const mockMemberships = [
        { tenantId: 'tenant1', role: 'admin', status: 'active' },
      ];

      userRepository.findById.mockResolvedValue(mockUser as any);
      userTenantRepository.findUserTenants.mockResolvedValue(mockMemberships as any);

      const result = await service.findUserById('user123', true);

      expect(result.memberships).toEqual(mockMemberships);
      expect(userTenantRepository.findUserTenants).toHaveBeenCalledWith('user123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findUserById('nonexistent', false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        username: 'newusername',
        email: 'newemail@example.com',
      };

      const updatedUser = { ...mockUser, username: 'newusername' };

      userRepository.findById.mockResolvedValue(mockUser as any);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.update.mockResolvedValue(updatedUser as any);

      const result = await service.updateUser('user123', updateDto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.updateUser('nonexistent', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email already in use', async () => {
      const updateDto = { email: 'existing@example.com' };
      const existingUser = { ...mockUser, email: 'existing@example.com' };

      userRepository.findById.mockResolvedValue(mockUser as any);
      userRepository.findByEmail.mockResolvedValue(existingUser as any);

      await expect(service.updateUser('user123', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser as any);
      userRepository.delete.mockResolvedValue(mockUser as any);

      await service.deleteUser('user123');

      expect(userRepository.delete).toHaveBeenCalledWith('user123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listUsers', () => {
    it('should list users with global scope', async () => {
      const query = { page: 1, size: 10, scope: 'global' as const };
      const mockResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      userRepository.searchUsers.mockResolvedValue(mockResult as any);

      const result = await service.listUsers(query);

      expect(result).toEqual(mockResult);
      expect(userRepository.searchUsers).toHaveBeenCalled();
    });

    it('should list users with tenant scope', async () => {
      const query = { page: 1, size: 10, scope: 'tenant' as const, tenantId: 'tenant123' };
      const mockResult = {
        members: [{
          _id: { toString: () => 'membership123' },
          userId: mockUser,
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
        }],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      userTenantRepository.listTenantMembers.mockResolvedValue(mockResult as any);

      const result = await service.listUsers(query);

      expect(result.users).toBeDefined();
      expect(userTenantRepository.listTenantMembers).toHaveBeenCalledWith({
        tenantId: 'tenant123',
        page: 1,
        limit: 10,
      });
    });

    it('should throw BadRequestException if tenantId missing for tenant scope', async () => {
      const query = { page: 1, size: 10, scope: 'tenant' as const };

      await expect(service.listUsers(query)).rejects.toThrow(BadRequestException);
    });
  });
});
