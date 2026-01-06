import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RabbitMQModule,
  RABBITMQ_CLIENT,
  RabbitMQClient,
} from '@shared/rabbitmq';
import {
  getRabbitMQConfig,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from '@shared/config/rabbitmq.config';
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
} from '@shared/schemas';

// Controllers
import { OrganizationController } from './controllers/organization.controller';
import { InvitationController } from './controllers/invitation.controller';
import { MembershipController } from './controllers/membership.controller';
import { RelationController } from './controllers/relation.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { OrganizationService } from './services/organization.service';
import { InvitationService } from './services/invitation.service';
import { MembershipService } from './services/membership.service';
import { RelationService } from './services/relation.service';
import { AuditService } from './services/audit.service';

// Repositories
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationRelationRepository } from './repositories/organization-relation.repository';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { AuditEventRepository } from './repositories/audit-event.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQModule.forRoot(getRabbitMQConfig()),
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
    ]),
  ],
  controllers: [
    OrganizationController,
    InvitationController,
    MembershipController,
    RelationController,
    HealthController,
  ],
  providers: [
    OrganizationService,
    InvitationService,
    MembershipService,
    RelationService,
    AuditService,
    OrganizationRepository,
    OrganizationRelationRepository,
    OrganizationMemberRepository,
    InvitationRepository,
    AuditEventRepository,
  ],
})
export class TenantModule implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly rabbitMQClient: RabbitMQClient,
  ) {}

  async onModuleInit() {
    // Setup exchanges
    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.EVENTS,
      type: 'topic',
      durable: true,
    });

    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.RPC,
      type: 'direct',
      durable: true,
    });

    await this.rabbitMQClient.createExchange({
      name: RABBITMQ_EXCHANGES.DLX,
      type: 'topic',
      durable: true,
    });

    // Setup queues with DLX
    await this.rabbitMQClient.createQueue(
      {
        name: RABBITMQ_QUEUES.TENANT_EVENTS,
        durable: true,
      },
      {
        exchange: RABBITMQ_EXCHANGES.DLX,
        routingKey: 'tenant.dlx',
        ttl: 60000,
      },
    );

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.TENANT_RPC,
      durable: true,
    });

    await this.rabbitMQClient.createQueue({
      name: RABBITMQ_QUEUES.TENANT_DLX,
      durable: true,
    });

    // Setup bindings
    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.TENANT_EVENTS,
      exchange: RABBITMQ_EXCHANGES.EVENTS,
      routingKey: 'tenant.*',
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.TENANT_RPC,
      exchange: RABBITMQ_EXCHANGES.RPC,
      routingKey: RABBITMQ_ROUTING_KEYS.RPC_TENANT,
    });

    await this.rabbitMQClient.bindQueue({
      queue: RABBITMQ_QUEUES.TENANT_DLX,
      exchange: RABBITMQ_EXCHANGES.DLX,
      routingKey: 'tenant.dlx',
    });

    console.log('Tenant service RabbitMQ setup complete');
  }
}
