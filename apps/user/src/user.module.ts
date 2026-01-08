import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UserRpcController } from './user-rpc.controller';
import { UserEventController } from './user-event.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { OrganizationMembershipController } from './controllers/organization-membership.controller';
import { UserService } from './user.service';
import { UserManagementService } from './services/user-management.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { RabbitMQClientModule } from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import {
  User,
  UserSchema,
  OrganizationMember,
  OrganizationMemberSchema,
} from '@shared/schemas';
import { UserRepository } from './repositories/user.repository';
import { OrganizationMemberRepository } from './repositories/organization-member.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    ]),
  ],
  controllers: [
    HealthController,
    UserRpcController,
    UserEventController,
    UserManagementController,
    OrganizationMembershipController,
  ],
  providers: [
    UserService,
    UserManagementService,
    OrganizationMembershipService,
    UserRepository,
    OrganizationMemberRepository,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class UserModule {}
