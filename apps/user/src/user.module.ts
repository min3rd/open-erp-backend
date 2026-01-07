import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { HealthController } from './health.controller';
import { UserRpcController } from './user-rpc.controller';
import { UserEventController } from './user-event.controller';
import { UserService } from './user.service';
import {
  RabbitMQClientModule,
  RabbitMQHealthIndicator,
} from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';
import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy module
    TerminusModule, // Health check module
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [
    UserController,
    HealthController,
    UserRpcController,
    UserEventController,
  ],
  providers: [
    UserService,
    UserRepository,
    {
      provide: RabbitMQHealthIndicator,
      useFactory: () => new RabbitMQHealthIndicator('UserService'),
    },
  ],
})
export class UserModule {}
