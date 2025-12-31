import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@shared/database';
import {
  RabbitMQModule,
  getRabbitMQConfig,
} from '@shared/rabbitmq';
import { AuthorizationService } from '@shared/authz/authorization.service';
import { PermissionService } from '@shared/services/permission.service';
import { ConfigController } from './controllers/config.controller';
import { UserConfigController } from './controllers/user-config.controller';
import { ConfigService } from './services/config.service';
import { ConfigRepository } from './repositories/config.repository';
import { Config, ConfigSchema } from './schemas/config.schema';

@Module({
  imports: [
    NestConfigModule.forRoot(),
    DatabaseModule,
    RabbitMQModule.forRoot(getRabbitMQConfig()),
    MongooseModule.forFeature([{ name: Config.name, schema: ConfigSchema }]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 20, // 20 requests per minute for config operations
      },
    ]),
  ],
  controllers: [ConfigController, UserConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    AuthorizationService,
    PermissionService,
  ],
  exports: [ConfigService, ConfigRepository],
})
export class ConfigServiceModule {}
