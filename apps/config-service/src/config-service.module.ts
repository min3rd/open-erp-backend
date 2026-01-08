import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@shared/database';
import { RabbitMQClientModule } from '@shared/rabbitmq/rabbitmq-client.module';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';
import { AuthorizationService } from '@shared/authz/authorization.service';
import { PermissionService } from '@shared/services/permission.service';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';
import { ConfigController } from './controllers/config.controller';
import { UserConfigController } from './controllers/user-config.controller';
import { NavigationController } from './controllers/navigation.controller';
import { HealthController } from './controllers/health.controller';
import { ConfigService } from './services/config.service';
import { NavigationService } from './services/navigation.service';
import { ConfigRepository } from './repositories/config.repository';
import { NavigationRepository } from './repositories/navigation.repository';
import { Config, ConfigSchema } from './schemas/config.schema';
import { Navigation, NavigationSchema } from './schemas/navigation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot(),
    DatabaseModule,
    RabbitMQClientModule.forRoot(),
    MongooseModule.forFeature([
      { name: Config.name, schema: ConfigSchema },
      { name: Navigation.name, schema: NavigationSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 20, // 20 requests per minute for config operations
      },
    ]),
  ],
  controllers: [ConfigController, UserConfigController, NavigationController, HealthController],
  providers: [
    ConfigService,
    NavigationService,
    ConfigRepository,
    NavigationRepository,
    AuthorizationService,
    PermissionService,
  ],
  exports: [ConfigService, NavigationService, ConfigRepository, NavigationRepository],
})
export class ConfigServiceModule {}
