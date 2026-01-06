import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  OrganizationMemberRepository,
  UpdateMemberDto,
} from '../repositories/organization-member.repository';
import { AuditService } from './audit.service';
import { AuditEventType, MemberRole } from '@shared/schemas';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly memberRepository: OrganizationMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async getUserOrganizations(userId: string) {
    return this.memberRepository.findByUserId(userId);
  }

  async getOrganizationMembers(organizationId: string) {
    return this.memberRepository.findByOrganizationId(organizationId);
  }

  async updateMemberRoles(
    memberId: string,
    roles: MemberRole[],
    updatedBy: string,
  ) {
    const updateDto: UpdateMemberDto = {
      roles,
      updatedBy: new Types.ObjectId(updatedBy),
    };

    const member = await this.memberRepository.update(memberId, updateDto);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.auditService.logEvent(
      AuditEventType.MEMBER_ROLE_UPDATED,
      member.organizationId.toString(),
      updatedBy,
      { memberId, roles },
      { description: 'Member roles updated' },
    );

    return member;
  }

  async removeMember(memberId: string, removedBy: string) {
    const member = await this.memberRepository.softDelete(
      memberId,
      new Types.ObjectId(removedBy),
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.auditService.logEvent(
      AuditEventType.MEMBER_REMOVED,
      member.organizationId.toString(),
      removedBy,
      { memberId },
      { description: 'Member removed from organization' },
    );

    return member;
  }
}
