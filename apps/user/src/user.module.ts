import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { HealthController } from './health.controller';
import { UserRpcController } from './user-rpc.controller';
import { UserEventController } from './user-event.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { TenantMembershipController } from './controllers/tenant-membership.controller';
import { UserService } from './user.service';
import { UserManagementService } from './services/user-management.service';
import { TenantMembershipService } from './services/tenant-membership.service';
import {
  RabbitMQClientModule,
} from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import { User, UserSchema, UserTenant, UserTenantSchema } from '@shared/schemas';
import { UserRepository } from './repositories/user.repository';
import { UserTenantRepository } from './repositories/user-tenant.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy module
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserTenant.name, schema: UserTenantSchema },
    ]),
  ],
  controllers: [
    UserController,
    HealthController,
    UserRpcController,
    UserEventController,
    UserManagementController,
    TenantMembershipController,
  ],
  providers: [
    UserService,
    UserManagementService,
    TenantMembershipService,
    UserRepository,
    UserTenantRepository,
  ],
})
export class UserModule {}
