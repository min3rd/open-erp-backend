import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrganizationInvitation,
  OrganizationInvitationDocument,
  InvitationStatus,
  InvitationScope,
} from '@shared/schemas';
import * as crypto from 'crypto';

export interface CreateInvitationDto {
  organizationId: Types.ObjectId;
  inviteeEmail?: string;
  inviteeUsername?: string;
  inviteeUserId?: Types.ObjectId;
  roles: string[];
  scope: InvitationScope;
  expiresAt: Date;
  message?: string;
  metadata?: Map<string, any>;
  invitedBy: Types.ObjectId;
}

export interface UpdateInvitationDto {
  status?: InvitationStatus;
  acceptedAt?: Date;
  revokedAt?: Date;
  acceptedBy?: Types.ObjectId;
}

@Injectable()
export class InvitationRepository {
  private readonly logger = new Logger(InvitationRepository.name);

  constructor(
    @InjectModel(OrganizationInvitation.name)
    private invitationModel: Model<OrganizationInvitationDocument>,
  ) {}

  /**
   * Generate a secure random token and its hash
   */
  generateToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(token + process.env.INVITE_SECRET)
      .digest('hex');
    return { token, hash };
  }

  /**
   * Hash a token for comparison
   */
  hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token + process.env.INVITE_SECRET)
      .digest('hex');
  }

  async create(
    createDto: CreateInvitationDto,
    tokenHash: string,
  ): Promise<OrganizationInvitationDocument> {
    try {
      const invitation = new this.invitationModel({
        ...createDto,
        tokenHash,
        status: InvitationStatus.PENDING,
      });
      return await invitation.save();
    } catch (error) {
      this.logger.error(
        `Error creating invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string): Promise<OrganizationInvitationDocument | null> {
    try {
      return await this.invitationModel.findById(id).exec();
    } catch (error) {
      this.logger.error(
        `Error finding invitation by id: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByToken(
    token: string,
  ): Promise<OrganizationInvitationDocument | null> {
    try {
      const tokenHash = this.hashToken(token);
      return await this.invitationModel
        .findOne({ tokenHash })
        .select('+tokenHash')
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding invitation by token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganizationId(
    organizationId: string,
    status?: InvitationStatus,
  ): Promise<OrganizationInvitationDocument[]> {
    try {
      const query: any = { organizationId: new Types.ObjectId(organizationId) };
      if (status) query.status = status;

      return await this.invitationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding invitations by organizationId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEmail(
    email: string,
    status?: InvitationStatus,
  ): Promise<OrganizationInvitationDocument[]> {
    try {
      const query: any = { inviteeEmail: email };
      if (status) query.status = status;

      return await this.invitationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding invitations by email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    status?: InvitationStatus,
  ): Promise<OrganizationInvitationDocument[]> {
    try {
      const query: any = { inviteeUserId: new Types.ObjectId(userId) };
      if (status) query.status = status;

      return await this.invitationModel.find(query).exec();
    } catch (error) {
      this.logger.error(
        `Error finding invitations by userId: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findPendingByOrgAndEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvitationDocument | null> {
    try {
      return await this.invitationModel
        .findOne({
          organizationId: new Types.ObjectId(organizationId),
          inviteeEmail: email,
          status: InvitationStatus.PENDING,
          expiresAt: { $gt: new Date() },
        })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error finding pending invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateDto: UpdateInvitationDto,
  ): Promise<OrganizationInvitationDocument | null> {
    try {
      return await this.invitationModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .exec();
    } catch (error) {
      this.logger.error(
        `Error updating invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAsExpired(
    cutoffDate: Date,
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.invitationModel
        .updateMany(
          {
            status: InvitationStatus.PENDING,
            expiresAt: { $lt: cutoffDate },
          },
          {
            $set: { status: InvitationStatus.EXPIRED },
          },
        )
        .exec();

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      this.logger.error(
        `Error marking invitations as expired: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async countByOrganization(
    organizationId: string,
    since: Date,
    status?: InvitationStatus,
  ): Promise<number> {
    try {
      const query: any = {
        organizationId: new Types.ObjectId(organizationId),
        createdAt: { $gte: since },
      };
      if (status) query.status = status;

      return await this.invitationModel.countDocuments(query).exec();
    } catch (error) {
      this.logger.error(
        `Error counting invitations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async softDelete(id: string): Promise<OrganizationInvitationDocument | null> {
    try {
      const invitation = await this.invitationModel.findById(id).exec();
      if (!invitation) {
        return null;
      }
      invitation.deletedAt = new Date();
      await invitation.save();
      return invitation;
    } catch (error) {
      this.logger.error(
        `Error soft deleting invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
