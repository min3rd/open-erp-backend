import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UserRepository } from '../repositories/user.repository';
import { UserTenantRepository } from '../repositories/user-tenant.repository';
import { InviteMemberDto, UpdateMembershipDto, ListTenantMembersQueryDto } from '../dto/membership.dto';
import { TenantRole, MembershipStatus } from '@shared/schemas';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';
import { RPC_METHODS } from '@shared/constants/message.constants';

@Injectable()
export class TenantMembershipService {
  private readonly logger = new Logger(TenantMembershipService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userTenantRepository: UserTenantRepository,
    @Inject(RABBITMQ_NOTIFICATION_CLIENT) private readonly notificationClient: ClientProxy,
  ) {}

  async inviteMember(
    tenantId: string,
    dto: InviteMemberDto,
    invitedById: string,
  ): Promise<any> {
    try {
      const { identifier, role, sendInviteEmail = true } = dto;

      // Check if identifier is email or username
      const isEmail = identifier.includes('@');
      
      let user;
      if (isEmail) {
        user = await this.userRepository.findByEmail(identifier);
      } else {
        user = await this.userRepository.findByUsername(identifier);
      }

      // If user doesn't exist, we need to create an invitation
      if (!user) {
        if (!isEmail) {
          throw new BadRequestException('User not found. Please use email address to invite new users.');
        }

        // Create invitation (will be implemented later with invitation table)
        this.logger.log(`Creating invitation for ${identifier} to tenant ${tenantId}`);
        
        // For now, throw error asking to create user first
        throw new BadRequestException('User not found. Please create the user first before inviting to tenant.');
      }

      // Check if user is already a member
      const existingMembership = await this.userTenantRepository.findByUserAndTenant(
        user._id.toString(),
        tenantId,
      );

      if (existingMembership && existingMembership.status !== MembershipStatus.REVOKED) {
        throw new BadRequestException('User is already a member of this tenant');
      }

      // Create or update membership
      let membership;
      if (existingMembership) {
        // Reactivate revoked membership
        membership = await this.userTenantRepository.update(existingMembership._id.toString(), {
          role,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date(),
        });
      } else {
        // Create new membership
        membership = await this.userTenantRepository.create({
          userId: user._id.toString(),
          tenantId,
          role,
          status: MembershipStatus.ACTIVE,
          invitedBy: invitedById,
          invitedAt: new Date(),
          joinedAt: new Date(),
        });
      }

      // Send invite email if requested
      if (sendInviteEmail) {
        try {
          this.notificationClient.emit('tenant.member.invited', {
            email: user.email,
            tenantId,
            role,
            invitedBy: invitedById,
          });
        } catch (error) {
          this.logger.warn(`Failed to send invite email: ${error.message}`);
        }
      }

      return membership;
    } catch (error) {
      this.logger.error(`Error inviting member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listTenantMembers(tenantId: string, query: ListTenantMembersQueryDto): Promise<any> {
    try {
      const { role, status, page = 1, size = 10 } = query;

      const result = await this.userTenantRepository.listTenantMembers({
        tenantId,
        role,
        status,
        page,
        limit: size,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error listing tenant members: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateMembership(
    tenantId: string,
    userId: string,
    dto: UpdateMembershipDto,
    updatedById: string,
  ): Promise<any> {
    try {
      const membership = await this.userTenantRepository.findByUserAndTenant(userId, tenantId);
      
      if (!membership) {
        throw new NotFoundException('Membership not found');
      }

      // Prevent removing the last owner
      if (dto.role && dto.role !== TenantRole.OWNER && membership.role === TenantRole.OWNER) {
        const ownerCount = await this.userTenantRepository.listTenantMembers({
          tenantId,
          role: TenantRole.OWNER,
          status: MembershipStatus.ACTIVE,
          page: 1,
          limit: 100,
        });

        if (ownerCount.total <= 1) {
          throw new BadRequestException('Cannot remove the last owner of the tenant');
        }
      }

      const updateData: any = {};
      if (dto.role) updateData.role = dto.role;
      if (dto.status) {
        updateData.status = dto.status;
        if (dto.status === MembershipStatus.REVOKED) {
          updateData.revokedAt = new Date();
          updateData.revokedBy = updatedById;
        }
      }

      const updated = await this.userTenantRepository.update(
        membership._id.toString(),
        updateData,
      );

      return updated;
    } catch (error) {
      this.logger.error(`Error updating membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeMember(
    tenantId: string,
    userId: string,
    removedById: string,
  ): Promise<void> {
    try {
      const membership = await this.userTenantRepository.findByUserAndTenant(userId, tenantId);
      
      if (!membership) {
        throw new NotFoundException('Membership not found');
      }

      // Prevent removing the last owner
      if (membership.role === TenantRole.OWNER) {
        const ownerCount = await this.userTenantRepository.listTenantMembers({
          tenantId,
          role: TenantRole.OWNER,
          status: MembershipStatus.ACTIVE,
          page: 1,
          limit: 100,
        });

        if (ownerCount.total <= 1) {
          throw new BadRequestException('Cannot remove the last owner of the tenant');
        }
      }

      // Soft delete the membership
      await this.userTenantRepository.delete(membership._id.toString());

      this.logger.log(`Removed user ${userId} from tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Error removing member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMembershipDetails(tenantId: string, userId: string): Promise<any> {
    try {
      const membership = await this.userTenantRepository.findByUserAndTenant(userId, tenantId);
      
      if (!membership) {
        throw new NotFoundException('Membership not found');
      }

      return membership;
    } catch (error) {
      this.logger.error(`Error getting membership: ${error.message}`, error.stack);
      throw error;
    }
  }
}
