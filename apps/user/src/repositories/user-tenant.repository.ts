import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserTenant, UserTenantDocument, TenantRole, MembershipStatus } from '@shared/schemas';

export interface CreateUserTenantDto {
  userId: string;
  tenantId: string;
  role: TenantRole;
  status?: MembershipStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
}

export interface UpdateUserTenantDto {
  role?: TenantRole;
  status?: MembershipStatus;
  joinedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

export interface ListMembersOptions {
  tenantId: string;
  role?: TenantRole;
  status?: MembershipStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class UserTenantRepository {
  private readonly logger = new Logger(UserTenantRepository.name);

  constructor(
    @InjectModel(UserTenant.name)
    private userTenantModel: Model<UserTenantDocument>,
  ) {}

  async create(dto: CreateUserTenantDto): Promise<UserTenant> {
    try {
      const membership = new this.userTenantModel({
        userId: dto.userId,
        tenantId: dto.tenantId,
        role: dto.role,
        status: dto.status || MembershipStatus.ACTIVE,
        invitedBy: dto.invitedBy,
        invitedAt: dto.invitedAt,
        joinedAt: dto.joinedAt,
      });
      return await membership.save();
    } catch (error) {
      this.logger.error(`Error creating membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<UserTenant | null> {
    try {
      return await this.userTenantModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error finding membership by id: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findByUserAndTenant(userId: string, tenantId: string): Promise<UserTenant | null> {
    try {
      return await this.userTenantModel
        .findOne({
          userId: userId as any,
          tenantId: tenantId as any,
        })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findUserTenants(userId: string): Promise<UserTenant[]> {
    try {
      return await this.userTenantModel
        .find({ userId: userId as any })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding user tenants: ${error.message}`, error.stack);
      throw error;
    }
  }

  async listTenantMembers(options: ListMembersOptions): Promise<{
    members: UserTenant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { tenantId, role, status, page = 1, limit = 10 } = options;
      
      const query: any = { tenantId: tenantId as any };
      if (role) query.role = role;
      if (status) query.status = status;

      const skip = (page - 1) * limit;

      const [members, total] = await Promise.all([
        this.userTenantModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'username email displayName avatarUrl')
          .exec(),
        this.userTenantModel.countDocuments(query).exec(),
      ]);

      return {
        members,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error listing tenant members: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserTenantDto): Promise<UserTenant | null> {
    try {
      const updateData: any = { ...dto };
      if (dto.revokedBy) {
        updateData.revokedBy = dto.revokedBy;
      }

      return await this.userTenantModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(`Error updating membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<UserTenant | null> {
    try {
      const membership = await this.userTenantModel.findById(id).exec();
      if (!membership) {
        return null;
      }
      membership.deletedAt = new Date();
      membership.status = MembershipStatus.REVOKED;
      await membership.save();
      return membership;
    } catch (error) {
      this.logger.error(`Error soft deleting membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.userTenantModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      this.logger.error(`Error hard deleting membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async isUserMemberOfTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      const membership = await this.findByUserAndTenant(userId, tenantId);
      return !!membership && membership.status === MembershipStatus.ACTIVE;
    } catch (error) {
      this.logger.error(`Error checking membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserRole(userId: string, tenantId: string): Promise<TenantRole | null> {
    try {
      const membership = await this.findByUserAndTenant(userId, tenantId);
      return membership?.role || null;
    } catch (error) {
      this.logger.error(`Error getting user role: ${error.message}`, error.stack);
      throw error;
    }
  }
}
