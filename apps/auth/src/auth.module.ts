import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import {
  RabbitMQClientModule,
} from '@shared/rabbitmq';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '@shared/database';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  VerificationToken,
  VerificationTokenSchema,
} from './schemas/verification-token.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';
import { VerificationTokenRepository } from './repositories/verification-token.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    RabbitMQClientModule.forRoot(), // Add NestJS ClientProxy for sending messages
    MongooseModule.forFeature([
      { name: VerificationToken.name, schema: VerificationTokenSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 5 requests per minute
      },
    ]),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    VerificationTokenRepository,
    RefreshTokenRepository,
    PasswordResetTokenRepository,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AuthModule {}
