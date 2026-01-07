import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantMembershipService } from '../../src/services/tenant-membership.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { TenantMemberRepository } from '../../src/repositories/tenant-member.repository';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';
import { TenantRole, MembershipStatus } from '@shared/schemas';

describe('TenantMembershipService', () => {
  let service: TenantMembershipService;
  let userRepository: jest.Mocked<UserRepository>;
  let tenantMemberRepository: jest.Mocked<TenantMemberRepository>;
  let notificationClient: jest.Mocked<any>;

  const mockUser = {
    _id: { toString: () => 'user123' },
    username: 'testuser',
    email: 'test@example.com',
    status: 'active',
  };

  const mockMembership = {
    _id: { toString: () => 'membership123' },
    userId: 'user123',
    tenantId: 'tenant123',
    role: TenantRole.MEMBER,
    status: MembershipStatus.ACTIVE,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
    };

    const mockTenantMemberRepository = {
      findByUserAndTenant: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      listTenantMembers: jest.fn(),
    };

    const mockNotificationClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMembershipService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: TenantMemberRepository,
          useValue: mockTenantMemberRepository,
        },
        {
          provide: RABBITMQ_NOTIFICATION_CLIENT,
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    service = module.get<TenantMembershipService>(TenantMembershipService);
    userRepository = module.get(UserRepository);
    tenantMemberRepository = module.get(TenantMemberRepository);
    notificationClient = module.get(RABBITMQ_NOTIFICATION_CLIENT);
  });

  describe('inviteMember', () => {
    it('should invite existing user by email', async () => {
      const inviteDto = {
        identifier: 'test@example.com',
        role: TenantRole.MEMBER,
        sendInviteEmail: true,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(null);
      tenantMemberRepository.create.mockResolvedValue(mockMembership as any);

      const result = await service.inviteMember('tenant123', inviteDto, 'inviter123');

      expect(result).toEqual(mockMembership);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(tenantMemberRepository.create).toHaveBeenCalled();
      expect(notificationClient.emit).toHaveBeenCalledWith('tenant.member.invited', expect.any(Object));
    });

    it('should invite existing user by username', async () => {
      const inviteDto = {
        identifier: 'testuser',
        role: TenantRole.ADMIN,
        sendInviteEmail: false,
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(mockUser as any);
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(null);
      tenantMemberRepository.create.mockResolvedValue(mockMembership as any);

      const result = await service.inviteMember('tenant123', inviteDto, 'inviter123');

      expect(result).toEqual(mockMembership);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('testuser');
      expect(notificationClient.emit).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already member', async () => {
      const inviteDto = {
        identifier: 'test@example.com',
        role: TenantRole.MEMBER,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(mockMembership as any);

      await expect(service.inviteMember('tenant123', inviteDto, 'inviter123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reactivate revoked membership', async () => {
      const inviteDto = {
        identifier: 'test@example.com',
        role: TenantRole.MEMBER,
      };

      const revokedMembership = {
        ...mockMembership,
        status: MembershipStatus.REVOKED,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser as any);
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(revokedMembership as any);
      tenantMemberRepository.update.mockResolvedValue(mockMembership as any);

      const result = await service.inviteMember('tenant123', inviteDto, 'inviter123');

      expect(tenantMemberRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found with username', async () => {
      const inviteDto = {
        identifier: 'nonexistentuser',
        role: TenantRole.MEMBER,
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);

      await expect(service.inviteMember('tenant123', inviteDto, 'inviter123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listTenantMembers', () => {
    it('should list tenant members with filters', async () => {
      const query = {
        role: TenantRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        page: 1,
        size: 10,
      };

      const mockResult = {
        members: [mockMembership],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      tenantMemberRepository.listTenantMembers.mockResolvedValue(mockResult as any);

      const result = await service.listTenantMembers('tenant123', query);

      expect(result).toEqual(mockResult);
      expect(tenantMemberRepository.listTenantMembers).toHaveBeenCalledWith({
        tenantId: 'tenant123',
        role: TenantRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('updateMembership', () => {
    it('should update membership role', async () => {
      const updateDto = {
        role: TenantRole.ADMIN,
      };

      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(mockMembership as any);
      tenantMemberRepository.update.mockResolvedValue({
        ...mockMembership,
        role: TenantRole.ADMIN,
      } as any);

      const result = await service.updateMembership('tenant123', 'user123', updateDto, 'updater123');

      expect(tenantMemberRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if membership not found', async () => {
      const updateDto = { role: TenantRole.ADMIN };

      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(null);

      await expect(
        service.updateMembership('tenant123', 'user123', updateDto, 'updater123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent removing last owner', async () => {
      const updateDto = { role: TenantRole.MEMBER };
      const ownerMembership = {
        ...mockMembership,
        role: TenantRole.OWNER,
      };

      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(ownerMembership as any);
      tenantMemberRepository.listTenantMembers.mockResolvedValue({
        members: [ownerMembership],
        total: 1,
        page: 1,
        totalPages: 1,
      } as any);

      await expect(
        service.updateMembership('tenant123', 'user123', updateDto, 'updater123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(mockMembership as any);
      tenantMemberRepository.delete.mockResolvedValue(mockMembership as any);
      tenantMemberRepository.listTenantMembers.mockResolvedValue({
        members: [mockMembership, mockMembership],
        total: 2,
        page: 1,
        totalPages: 1,
      } as any);

      await service.removeMember('tenant123', 'user123', 'remover123');

      expect(tenantMemberRepository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if membership not found', async () => {
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(null);

      await expect(service.removeMember('tenant123', 'user123', 'remover123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent removing last owner', async () => {
      const ownerMembership = {
        ...mockMembership,
        role: TenantRole.OWNER,
      };

      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(ownerMembership as any);
      tenantMemberRepository.listTenantMembers.mockResolvedValue({
        members: [ownerMembership],
        total: 1,
        page: 1,
        totalPages: 1,
      } as any);

      await expect(service.removeMember('tenant123', 'user123', 'remover123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMembershipDetails', () => {
    it('should return membership details', async () => {
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(mockMembership as any);

      const result = await service.getMembershipDetails('tenant123', 'user123');

      expect(result).toEqual(mockMembership);
    });

    it('should throw NotFoundException if membership not found', async () => {
      tenantMemberRepository.findByUserAndTenant.mockResolvedValue(null);

      await expect(service.getMembershipDetails('tenant123', 'user123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
