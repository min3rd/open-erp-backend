import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrganizationMember,
  OrganizationMemberDocument,
  MemberRole,
  MemberStatus,
} from '@shared/schemas';

export interface CreateMemberDto {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  roles: MemberRole[];
  status?: MemberStatus;
  joinedAt?: Date;
  isPrimaryOwner?: boolean;
  metadata?: Map<string, any>;
  createdBy: Types.ObjectId;
}

export interface UpdateMemberDto {
  roles?: MemberRole[];
  status?: MemberStatus;
  leftAt?: Date;
  metadata?: Map<string, any>;
  updatedBy?: Types.ObjectId;
}

@Injectable()
export class OrganizationMemberRepository {
  private readonly logger = new Logger(OrganizationMemberRepository.name);

  constructor(
    @InjectModel(OrganizationMember.name)
    private memberModel: Model<OrganizationMemberDocument>,
  ) {}

  async create(
    createDto: CreateMemberDto,
  ): Promise<OrganizationMemberDocument> {
    try {
      const member = new this.memberModel(createDto);
      return await member.save();
    } catch (error) {
      this.logger.error(
        `Error creating member: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationMemberDocument | null> {
    try {
      return await this.memberModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding member by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: string,
    status?: MemberStatus,
  ): Promise<OrganizationMemberDocument[]> {
    try {
      const query: any = { organizationId };
      if (status) query.status = status;

      return await this.memberModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding members by organizationId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    status?: MemberStatus,
  ): Promise<OrganizationMemberDocument[]> {
    try {
      const query: any = { userId: new Types.ObjectId(userId) };
      if (status) query.status = status;

      return await this.memberModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding members by userId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberDocument | null> {
    try {
      return await this.memberModel
        .findOne({
          organizationId: organizationId as any,
          userId: userId as any,
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding member by org and user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByPrimaryOwner(
    organizationId: string,
  ): Promise<OrganizationMemberDocument | null> {
    try {
      return await this.memberModel
        .findOne({
          organizationId: organizationId as any,
          isPrimaryOwner: true,
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding primary owner: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByRole(
    organizationId: string,
    role: MemberRole,
  ): Promise<OrganizationMemberDocument[]> {
    try {
      return await this.memberModel
        .find({
          organizationId: organizationId as any,
          roles: role,
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding members by role: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdateMemberDto,
  ): Promise<OrganizationMemberDocument | null> {
    try {
      return await this.memberModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error updating member: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async softDelete(
    id: string,
    deletedBy: Types.ObjectId,
  ): Promise<OrganizationMemberDocument | null> {
    try {
      const member = await this.memberModel.findById(id).exec();
      if (!member) {
        return null;
      }
      member.deletedAt = new Date();
      member.leftAt = new Date();
      member.status = MemberStatus.INACTIVE;
      member.updatedBy = deletedBy as any;
      await member.save();
      return member;
    } catch (error) {
      this.logger.error(
        `Error soft deleting member: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async count(
    organizationId: string,
    filters: {
      status?: MemberStatus;
      role?: MemberRole;
    } = {},
  ): Promise<number> {
    try {
      const query: any = { organizationId };
      if (filters.status) query.status = filters.status;
      if (filters.role) query.roles = filters.role;

      return await this.memberModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting members: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
