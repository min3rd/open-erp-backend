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
  permissions?: string[];
  status?: MemberStatus;
  joinedAt?: Date;
  isPrimaryOwner?: boolean;
  metadata?: Map<string, any>;
  createdBy: Types.ObjectId;
}

export interface UpdateMemberDto {
  roles?: MemberRole[];
  permissions?: string[];
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
      this.logger.error(`Error creating member: ${error.message}`, error.stack);
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
      this.logger.error(`Error updating member: ${error.message}`, error.stack);
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

  /**
   * Find user memberships with organization details
   */
  async findUserOrgsWithDetails(
    userId: string,
    options: { includeOrgDetails?: boolean } = {},
  ): Promise<OrganizationMemberDocument[]> {
    try {
      const filter: any = {
        userId: new Types.ObjectId(userId),
        status: MemberStatus.ACTIVE,
      };
      let query = this.memberModel.find(filter);

      if (options.includeOrgDetails) {
        query = query.populate('organizationId');
      }

      return await query.exec();
    } catch (error) {
      this.logger.error(
        `Error finding user orgs with details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Add roles and/or permissions to a member
   */
  async addRolesAndPermissions(
    membershipId: string,
    roles: MemberRole[],
    permissions: string[],
    updatedBy: Types.ObjectId,
  ): Promise<OrganizationMemberDocument | null> {
    try {
      const update: any = {
        updatedBy,
      };

      if (roles && roles.length > 0) {
        update.$addToSet = { ...update.$addToSet, roles: { $each: roles } };
      }

      if (permissions && permissions.length > 0) {
        update.$addToSet = {
          ...update.$addToSet,
          permissions: { $each: permissions },
        };
      }

      return await this.memberModel
        .findByIdAndUpdate(membershipId, update, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error adding roles and permissions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Upsert membership: create if not exists, update roles/permissions if exists
   */
  async upsertMembership(
    organizationId: string,
    userId: string,
    roles: MemberRole[],
    permissions: string[],
    createdBy: Types.ObjectId,
  ): Promise<OrganizationMemberDocument> {
    try {
      const existingMember = await this.findByOrganizationAndUser(
        organizationId,
        userId,
      );

      if (existingMember) {
        // Update existing membership
        return (await this.addRolesAndPermissions(
          existingMember._id.toString(),
          roles,
          permissions,
          createdBy,
        )) as OrganizationMemberDocument;
      }

      // Create new membership with permissions
      return await this.create({
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
        roles: roles.length > 0 ? roles : [MemberRole.MEMBER],
        permissions: permissions || [],
        status: MemberStatus.ACTIVE,
        joinedAt: new Date(),
        createdBy,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error upserting membership: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
