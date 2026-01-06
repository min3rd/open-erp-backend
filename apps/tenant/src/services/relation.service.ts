import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  OrganizationRelationRepository,
  CreateRelationDto,
  UpdateRelationDto,
} from '../repositories/organization-relation.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { AuditService } from './audit.service';
import { AuditEventType, RelationType, RelationStatus } from '@shared/schemas';

@Injectable()
export class RelationService {
  private readonly logger = new Logger(RelationService.name);

  constructor(
    private readonly relationRepository: OrganizationRelationRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    parentId: string,
    childId: string,
    relationType: RelationType,
    createdBy: string,
    options?: {
      sharePercentage?: number;
      effectiveDate?: Date;
      notes?: string;
    },
  ) {
    try {
      // Validate both organizations exist
      const parent = await this.organizationRepository.findById(parentId);
      const child = await this.organizationRepository.findById(childId);

      if (!parent) {
        throw new NotFoundException('Parent organization not found');
      }
      if (!child) {
        throw new NotFoundException('Child organization not found');
      }

      // Prevent self-reference
      if (parentId === childId) {
        throw new BadRequestException('Organization cannot be its own parent');
      }

      // Check for existing relation
      const existing = await this.relationRepository.findByParentAndChild(
        parentId,
        childId,
      );
      if (existing) {
        throw new BadRequestException('Relation already exists');
      }

      // Create relation
      const createDto: CreateRelationDto = {
        parentId: new Types.ObjectId(parentId),
        childId: new Types.ObjectId(childId),
        relationType,
        sharePercentage: options?.sharePercentage,
        effectiveDate: options?.effectiveDate || new Date(),
        notes: options?.notes,
        status: RelationStatus.ACTIVE,
        createdBy: new Types.ObjectId(createdBy),
      };

      const relation = await this.relationRepository.create(createDto);

      // Log audit event
      await this.auditService.logEvent(
        AuditEventType.RELATION_CREATED,
        parentId,
        createdBy,
        { relation },
        { description: `Created ${relationType} relation` },
      );

      return relation;
    } catch (error) {
      this.logger.error(
        `Error creating relation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByOrganization(organizationId: string) {
    const parents = await this.relationRepository.findByChildId(organizationId);
    const children =
      await this.relationRepository.findByParentId(organizationId);

    return { parents, children };
  }

  async update(
    relationId: string,
    updateDto: UpdateRelationDto,
    updatedBy: string,
  ) {
    const relation = await this.relationRepository.update(relationId, {
      ...updateDto,
      updatedBy: new Types.ObjectId(updatedBy),
    });

    if (!relation) {
      throw new NotFoundException('Relation not found');
    }

    await this.auditService.logEvent(
      AuditEventType.RELATION_UPDATED,
      relation.parentId.toString(),
      updatedBy,
      { relationId, changes: updateDto },
      { description: 'Relation updated' },
    );

    return relation;
  }

  async delete(relationId: string, deletedBy: string) {
    const relation = await this.relationRepository.softDelete(
      relationId,
      new Types.ObjectId(deletedBy),
    );

    if (!relation) {
      throw new NotFoundException('Relation not found');
    }

    await this.auditService.logEvent(
      AuditEventType.RELATION_DELETED,
      relation.parentId.toString(),
      deletedBy,
      { relationId },
      { description: 'Relation deleted' },
    );

    return relation;
  }
}
