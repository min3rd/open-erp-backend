import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  InvitationRepository,
  CreateInvitationDto,
} from '../repositories/invitation.repository';
import {
  OrganizationMemberRepository,
  CreateMemberDto,
} from '../repositories/organization-member.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { AuditService } from './audit.service';
import {
  AuditEventType,
  InvitationStatus,
  InvitationScope,
  MemberRole,
  MemberStatus,
} from '@shared/schemas';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly memberRepository: OrganizationMemberRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    organizationId: string,
    inviteeEmail: string,
    roles: string[],
    invitedBy: string,
    options?: {
      scope?: InvitationScope;
      message?: string;
      expiryDays?: number;
    },
  ) {
    try {
      // Verify organization exists
      const organization =
        await this.organizationRepository.findById(organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check for existing pending invitation
      const existing = await this.invitationRepository.findPendingByOrgAndEmail(
        organizationId,
        inviteeEmail,
      );
      if (existing) {
        throw new BadRequestException(
          'An active invitation already exists for this email',
        );
      }

      // Generate token
      const { token, hash } = this.invitationRepository.generateToken();

      // Calculate expiry
      const expiryDays =
        options?.expiryDays || parseInt(process.env.INVITE_EXPIRY_DAYS || '7');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Create invitation
      const createDto: CreateInvitationDto = {
        organizationId: new Types.ObjectId(organizationId),
        inviteeEmail,
        roles,
        scope: options?.scope || InvitationScope.ORGANIZATION,
        expiresAt,
        message: options?.message,
        invitedBy: new Types.ObjectId(invitedBy),
      };

      const invitation = await this.invitationRepository.create(
        createDto,
        hash,
      );

      // Log audit event
      await this.auditService.logEvent(
        AuditEventType.MEMBER_INVITED,
        organizationId,
        invitedBy,
        { inviteeEmail, roles },
        { description: `Invited ${inviteeEmail} to organization` },
      );

      return { invitation, token };
    } catch (error) {
      this.logger.error(
        `Error creating invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async accept(token: string, userId: string) {
    try {
      // Find invitation by token
      const invitation = await this.invitationRepository.findByToken(token);

      if (!invitation) {
        throw new NotFoundException('Invalid invitation token');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException(`Invitation is ${invitation.status}`);
      }

      if (invitation.expiresAt < new Date()) {
        await this.invitationRepository.update(invitation._id.toString(), {
          status: InvitationStatus.EXPIRED,
        });
        throw new BadRequestException('Invitation has expired');
      }

      // Check if user is already a member
      const existing = await this.memberRepository.findByOrganizationAndUser(
        invitation.organizationId.toString(),
        userId,
      );

      if (existing) {
        throw new BadRequestException(
          'User is already a member of this organization',
        );
      }

      // Create membership
      const memberDto: CreateMemberDto = {
        organizationId: invitation.organizationId as any,
        userId: new Types.ObjectId(userId),
        roles: invitation.roles as MemberRole[],
        status: MemberStatus.ACTIVE,
        createdBy: invitation.invitedBy as any,
      };

      const member = await this.memberRepository.create(memberDto);

      // Update invitation
      await this.invitationRepository.update(invitation._id.toString(), {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedBy: new Types.ObjectId(userId),
      });

      // Log audit events
      await this.auditService.logEvent(
        AuditEventType.INVITATION_ACCEPTED,
        invitation.organizationId.toString(),
        userId,
        { invitationId: invitation._id },
        { description: 'Invitation accepted' },
      );

      await this.auditService.logEvent(
        AuditEventType.MEMBER_JOINED,
        invitation.organizationId.toString(),
        userId,
        { member },
        { description: 'New member joined organization' },
      );

      return member;
    } catch (error) {
      this.logger.error(
        `Error accepting invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganization(organizationId: string, status?: InvitationStatus) {
    return this.invitationRepository.findByOrganizationId(
      organizationId,
      status,
    );
  }

  async revoke(invitationId: string, userId: string) {
    const invitation = await this.invitationRepository.update(invitationId, {
      status: InvitationStatus.REVOKED,
      revokedAt: new Date(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.auditService.logEvent(
      AuditEventType.INVITATION_REVOKED,
      invitation.organizationId.toString(),
      userId,
      { invitationId },
      { description: 'Invitation revoked' },
    );

    return invitation;
  }
}
