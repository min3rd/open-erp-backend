import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UserRepository } from '../repositories/user.repository';
import { OrganizationMemberRepository } from '../repositories/organization-member.repository';
import { InviteMemberDto, UpdateMembershipDto, ListOrganizationMembersQueryDto } from '../dto/membership.dto';
import { MemberRole, MemberStatus } from '@shared/schemas';
import { RABBITMQ_NOTIFICATION_CLIENT } from '@shared/rabbitmq';
import { RPC_METHODS } from '@shared/constants/message.constants';

@Injectable()
export class OrganizationMembershipService {
  private readonly logger = new Logger(OrganizationMembershipService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    @Inject(RABBITMQ_NOTIFICATION_CLIENT) private readonly notificationClient: ClientProxy,
  ) {}

  async inviteMember(
    organizationId: string,
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
        this.logger.log(`Creating invitation for ${identifier} to organization ${organizationId}`);
        
        // For now, throw error asking to create user first
        throw new BadRequestException('User not found. Please create the user first before inviting to organization.');
      }

      // Check if user is already a member
      const existingMembership = await this.organizationMemberRepository.findByUserAndOrganization(
        user._id.toString(),
        organizationId,
      );

      if (existingMembership && existingMembership.status !== MemberStatus.REVOKED) {
        throw new BadRequestException('User is already a member of this organization');
      }

      // Create or update membership
      let membership;
      if (existingMembership) {
        // Reactivate revoked membership
        membership = await this.organizationMemberRepository.update(existingMembership._id.toString(), {
          role,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        });
      } else {
        // Create new membership
        membership = await this.organizationMemberRepository.create({
          userId: user._id.toString(),
          organizationId,
          role,
          status: MemberStatus.ACTIVE,
          invitedBy: invitedById,
          invitedAt: new Date(),
          joinedAt: new Date(),
          createdBy: invitedById,
        });
      }

      // Send invite email if requested
      if (sendInviteEmail) {
        try {
          this.notificationClient.emit('organization.member.invited', {
            email: user.email,
            organizationId,
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

  async listOrganizationMembers(organizationId: string, query: ListOrganizationMembersQueryDto): Promise<any> {
    try {
      const { role, status, page = 1, size = 10 } = query;

      const result = await this.organizationMemberRepository.listOrganizationMembers({
        organizationId,
        role,
        status,
        page,
        limit: size,
      });

      return result;
    } catch (error) {
      this.logger.error(`Error listing organization members: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateMembership(
    organizationId: string,
    userId: string,
    dto: UpdateMembershipDto,
    updatedById: string,
  ): Promise<any> {
    try {
      const membership = await this.organizationMemberRepository.findByUserAndOrganization(userId, organizationId);
      
      if (!membership) {
        throw new NotFoundException('Membership not found');
      }

      // Prevent removing the last owner
      if (dto.role && dto.role !== MemberRole.OWNER && membership.roles?.includes(MemberRole.OWNER)) {
        const ownerCount = await this.organizationMemberRepository.listOrganizationMembers({
          organizationId,
          role: MemberRole.OWNER,
          status: MemberStatus.ACTIVE,
          page: 1,
          limit: 100,
        });

        if (ownerCount.total <= 1) {
          throw new BadRequestException('Cannot remove the last owner of the organization');
        }
      }

      const updateData: any = {};
      if (dto.role) updateData.role = dto.role;
      if (dto.status) {
        updateData.status = dto.status;
        if (dto.status === MemberStatus.REVOKED) {
          updateData.revokedAt = new Date();
          updateData.revokedBy = updatedById;
        }
      }

      const updated = await this.organizationMemberRepository.update(
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
    organizationId: string,
    userId: string,
    removedById: string,
  ): Promise<void> {
    try {
      const membership = await this.organizationMemberRepository.findByUserAndOrganization(userId, organizationId);
      
      if (!membership) {
        throw new NotFoundException('Membership not found');
      }

      // Prevent removing the last owner
      if (membership.roles?.includes(MemberRole.OWNER)) {
        const ownerCount = await this.organizationMemberRepository.listOrganizationMembers({
          organizationId,
          role: MemberRole.OWNER,
          status: MemberStatus.ACTIVE,
          page: 1,
          limit: 100,
        });

        if (ownerCount.total <= 1) {
          throw new BadRequestException('Cannot remove the last owner of the organization');
        }
      }

      // Soft delete the membership
      await this.organizationMemberRepository.delete(membership._id.toString());

      this.logger.log(`Removed user ${userId} from organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`Error removing member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMembershipDetails(organizationId: string, userId: string): Promise<any> {
    try {
      const membership = await this.organizationMemberRepository.findByUserAndOrganization(userId, organizationId);
      
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
