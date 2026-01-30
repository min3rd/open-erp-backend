import { Module } from '@nestjs/common';
import { LoggerModule } from '@shared/logger';
import { HealthController } from './health.controller';
import { UserRpcController } from './user-rpc.controller';
import { UserEventController } from './user-event.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { OrganizationMembershipController } from './controllers/organization-membership.controller';
import { SystemAdminController } from './controllers/system-admin.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AuditController } from './controllers/audit.controller';
import { UserService } from './user.service';
import { UserManagementService } from './services/user-management.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { AdminUserService } from './services/admin-user.service';
import { UserAuditService } from './services/user-audit.service';
import { RabbitMQClientModule } from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthorizationService } from '@shared/authz';
import { APP_GUARD } from '@nestjs/core';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import {
  User,
  UserSchema,
  OrganizationMember,
  OrganizationMemberSchema,
  Role,
  RoleSchema,
  UserAuditEvent,
  UserAuditEventSchema,
} from '@shared/schemas';
import { UserRepository } from './repositories/user.repository';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserAuditEventRepository } from './repositories/user-audit-event.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule,
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy module
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: Role.name, schema: RoleSchema },
      { name: UserAuditEvent.name, schema: UserAuditEventSchema },
    ]),
  ],
  controllers: [
    HealthController,
    UserRpcController,
    UserEventController,
    UserManagementController,
    OrganizationMembershipController,
    SystemAdminController,
    AdminUserController,
    AuditController,
  ],
  providers: [
    UserService,
    UserManagementService,
    OrganizationMembershipService,
    AdminUserService,
    UserAuditService,
    UserRepository,
    OrganizationMemberRepository,
    RoleRepository,
    UserAuditEventRepository,
    AuthorizationService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class UserModule {}
