import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

// Schemas
import {
  Organization,
  OrganizationSchema,
  OrganizationRelation,
  OrganizationRelationSchema,
  OrganizationMember,
  OrganizationMemberSchema,
  OrganizationInvitation,
  OrganizationInvitationSchema,
  OrganizationAuditEvent,
  OrganizationAuditEventSchema,
  Warehouse,
  WarehouseSchema,
  Province,
  ProvinceSchema,
  Ward,
  WardSchema,
} from '@shared/schemas';

// Controllers
import { OrganizationController } from './controllers/organization.controller';
import { InvitationController } from './controllers/invitation.controller';
import { MembershipController } from './controllers/membership.controller';
import { RelationController } from './controllers/relation.controller';
import { HealthController } from './controllers/health.controller';
import { WarehouseController } from '../../inventory/src/controllers/warehouse.controller';

// Services
import { OrganizationService } from './services/organization.service';
import { InvitationService } from './services/invitation.service';
import { MembershipService } from './services/membership.service';
import { RelationService } from './services/relation.service';
import { AuditService } from './services/audit.service';
import { WarehouseService } from '../../inventory/src/services/warehouse.service';

// Repositories
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationRelationRepository } from './repositories/organization-relation.repository';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { WarehouseRepository } from '../../inventory/src/repositories/warehouse.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationRelation.name, schema: OrganizationRelationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      {
        name: OrganizationInvitation.name,
        schema: OrganizationInvitationSchema,
      },
      {
        name: OrganizationAuditEvent.name,
        schema: OrganizationAuditEventSchema,
      },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: Ward.name, schema: WardSchema },
    ]),
  ],
  controllers: [
    OrganizationController,
    InvitationController,
    MembershipController,
    RelationController,
    HealthController,
    WarehouseController,
  ],
  providers: [
    OrganizationService,
    InvitationService,
    MembershipService,
    RelationService,
    AuditService,
    WarehouseService,
    OrganizationRepository,
    OrganizationRelationRepository,
    OrganizationMemberRepository,
    InvitationRepository,
    AuditEventRepository,
    WarehouseRepository,
  ],
})
export class OrganizationModule {}
