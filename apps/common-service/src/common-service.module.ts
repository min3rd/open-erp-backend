import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

// Import schemas
import {
  Province,
  ProvinceSchema,
  District,
  DistrictSchema,
  Ward,
  WardSchema,
  Address,
  AddressSchema,
  User,
  UserSchema,
  Organization,
  OrganizationSchema,
} from '@shared/schemas';

// Import services
import { ProvinceService } from './services/province.service';
import { DistrictService } from './services/district.service';
import { WardService } from './services/ward.service';
import { AddressService } from './services/address.service';

// Import repositories
import { ProvinceRepository } from './repositories/province.repository';
import { DistrictRepository } from './repositories/district.repository';
import { WardRepository } from './repositories/ward.repository';
import { AddressRepository } from './repositories/address.repository';

// Import controllers
import { ProvinceController } from './controllers/province.controller';
import { DistrictController } from './controllers/district.controller';
import { WardController } from './controllers/ward.controller';
import { AddressController } from './controllers/address.controller';
import { HealthController } from './controllers/health.controller';

// Import shared modules
import { AuthorizationService } from '@shared/authz/authorization.service';
import { PermissionService } from '@shared/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const config = getDatabaseConfig();
        return getMongooseOptions(config);
      },
    }),
    MongooseModule.forFeature([
      { name: Province.name, schema: ProvinceSchema },
      { name: District.name, schema: DistrictSchema },
      { name: Ward.name, schema: WardSchema },
      { name: Address.name, schema: AddressSchema },
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [
    ProvinceController,
    DistrictController,
    WardController,
    AddressController,
    HealthController,
  ],
  providers: [
    ProvinceService,
    DistrictService,
    WardService,
    AddressService,
    ProvinceRepository,
    DistrictRepository,
    WardRepository,
    AddressRepository,
    AuthorizationService,
    PermissionService,
  ],
})
export class CommonServiceModule {}
