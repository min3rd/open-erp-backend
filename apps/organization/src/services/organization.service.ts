import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  OrganizationRepository,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '../repositories/organization.repository';
import {
  OrganizationMemberRepository,
  CreateMemberDto,
} from '../repositories/organization-member.repository';
import { AuditService } from './audit.service';
import { AuditEventType, MemberRole, MemberStatus } from '@shared/schemas';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly memberRepository: OrganizationMemberRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createDto: CreateOrganizationDto, userId: string) {
    try {
      // Check if taxId already exists
      const existing = await this.organizationRepository.findByTaxId(
        createDto.taxId,
        createDto.country || 'VN',
      );

      if (existing) {
        throw new BadRequestException(
          `Organization with taxId ${createDto.taxId} already exists`,
        );
      }

      // Create organization
      const organization = await this.organizationRepository.create({
        ...createDto,
        createdBy: new Types.ObjectId(userId),
      });

      // Add creator as primary owner
      const memberDto: CreateMemberDto = {
        organizationId: organization._id,
        userId: new Types.ObjectId(userId),
        roles: [MemberRole.OWNER],
        status: MemberStatus.ACTIVE,
        isPrimaryOwner: true,
        createdBy: new Types.ObjectId(userId),
      };

      await this.memberRepository.create(memberDto);

      // Log audit event
      await this.auditService.logEvent(
        AuditEventType.ORGANIZATION_CREATED,
        organization._id.toString(),
        userId,
        { organization },
        { description: `Organization ${organization.name} created` },
      );

      return organization;
    } catch (error) {
      this.logger.error(
        `Error creating organization: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(id: string) {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }
    return organization;
  }

  async findAll(filters: any = {}) {
    return this.organizationRepository.findAll(filters);
  }

  async update(id: string, updateDto: UpdateOrganizationDto, userId: string) {
    const organization = await this.organizationRepository.update(id, {
      ...updateDto,
      updatedBy: new Types.ObjectId(userId),
    });

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    await this.auditService.logEvent(
      AuditEventType.ORGANIZATION_UPDATED,
      id,
      userId,
      { changes: updateDto },
      { description: `Organization ${organization.name} updated` },
    );

    return organization;
  }

  async delete(id: string, userId: string) {
    const organization = await this.organizationRepository.softDelete(
      id,
      new Types.ObjectId(userId),
    );

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    await this.auditService.logEvent(
      AuditEventType.ORGANIZATION_DELETED,
      id,
      userId,
      { organization },
      { description: `Organization ${organization.name} deleted` },
    );

    return organization;
  }
}
