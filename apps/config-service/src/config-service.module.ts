import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@shared/database';
import { RabbitMQModule } from '@shared/rabbitmq';
import { RabbitMQClientModule } from '@shared/rabbitmq/rabbitmq-client.module';
import { getRabbitMQConfig } from '@shared/config/rabbitmq.config';
import { AuthorizationService } from '@shared/authz/authorization.service';
import { PermissionService } from '@shared/services/permission.service';
import { User, UserSchema, Role, RoleSchema } from '@shared/schemas';
import { ConfigController } from './controllers/config.controller';
import { UserConfigController } from './controllers/user-config.controller';
import { HealthController } from './controllers/health.controller';
import { ConfigService } from './services/config.service';
import { ConfigRepository } from './repositories/config.repository';
import { Config, ConfigSchema } from './schemas/config.schema';

@Module({
  imports: [
    NestConfigModule.forRoot(),
    DatabaseModule,
    RabbitMQModule.forRoot(getRabbitMQConfig()),
    RabbitMQClientModule.forRoot(),
    MongooseModule.forFeature([
      { name: Config.name, schema: ConfigSchema },
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
  controllers: [ConfigController, UserConfigController, HealthController],
  providers: [
    ConfigService,
    ConfigRepository,
    AuthorizationService,
    PermissionService,
  ],
  exports: [ConfigService, ConfigRepository],
})
export class ConfigServiceModule {}
