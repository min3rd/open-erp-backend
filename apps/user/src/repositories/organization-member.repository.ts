import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrganizationMember, OrganizationMemberDocument, MemberRole, MemberStatus } from '@shared/schemas';

export interface CreateOrganizationMemberDto {
  userId: string;
  organizationId: string;
  role: MemberRole;
  status?: MemberStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdBy: string;
}

export interface UpdateOrganizationMemberDto {
  role?: MemberRole;
  status?: MemberStatus;
  joinedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  updatedBy?: string;
}

export interface ListMembersOptions {
  organizationId: string;
  role?: MemberRole;
  status?: MemberStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class OrganizationMemberRepository {
  private readonly logger = new Logger(OrganizationMemberRepository.name);

  constructor(
    @InjectModel(OrganizationMember.name)
    private memberModel: Model<OrganizationMemberDocument>,
  ) {}

  async create(dto: CreateOrganizationMemberDto): Promise<OrganizationMember> {
    try {
      const membership = new this.memberModel({
        userId: dto.userId,
        organizationId: dto.organizationId,
        roles: [dto.role],
        status: dto.status || MemberStatus.ACTIVE,
        invitedBy: dto.invitedBy,
        invitedAt: dto.invitedAt,
        joinedAt: dto.joinedAt,
        createdBy: dto.createdBy,
      });
      return await membership.save();
    } catch (error) {
      this.logger.error(`Error creating membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationMember | null> {
    try {
      return await this.memberModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding membership by id: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null> {
    try {
      return await this.memberModel
        .findOne({
          userId: userId as any,
          organizationId: organizationId as any,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findUserOrganizations(userId: string): Promise<OrganizationMember[]> {
    try {
      return await this.memberModel
        .find({ userId: userId as any })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding user organizations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listOrganizationMembers(options: ListMembersOptions): Promise<{
    members: OrganizationMember[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { organizationId, role, status, page = 1, limit = 10 } = options;
      
      const query: any = { organizationId: organizationId as any };
      if (role) query.roles = role;
      if (status) query.status = status;

      const skip = (page - 1) * limit;

      const [members, total] = await Promise.all([
        this.memberModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'username email displayName avatarUrl')
          .exec(),
        this.memberModel.countDocuments(query).exec(),
      ]);

      return {
        members,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error listing organization members: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdateOrganizationMemberDto): Promise<OrganizationMember | null> {
    try {
      const updateData: any = {};
      if (dto.role) updateData.roles = [dto.role];
      if (dto.status) updateData.status = dto.status;
      if (dto.joinedAt) updateData.joinedAt = dto.joinedAt;
      if (dto.revokedAt) updateData.revokedAt = dto.revokedAt;
      if (dto.revokedBy) updateData.revokedBy = dto.revokedBy;
      if (dto.updatedBy) updateData.updatedBy = dto.updatedBy;

      return await this.memberModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<OrganizationMember | null> {
    try {
      const membership = await this.memberModel.findById(id).exec();
      if (!membership) {
        return null;
      }
      membership.deletedAt = new Date();
      membership.status = MemberStatus.REVOKED;
      await membership.save();
      return membership;
    } catch (error) {
      this.logger.error(`Error soft deleting membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.memberModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.logger.error(`Error hard deleting membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean> {
    try {
      const membership = await this.findByUserAndOrganization(userId, organizationId);
      return !!membership && membership.status === MemberStatus.ACTIVE;
    } catch (error) {
      this.logger.error(`Error checking membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserRole(userId: string, organizationId: string): Promise<MemberRole | null> {
    try {
      const membership = await this.findByUserAndOrganization(userId, organizationId);
      return membership?.roles?.[0] || null;
    } catch (error) {
      this.logger.error(`Error getting user role: ${error.message}`, error.stack);
      throw error;
    }
  }
}
