import { Module } from '@nestjs/common';
import { LoggerModule } from '@shared/logger';
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
  Role,
  RoleSchema,
  GeometryVersion,
  GeometryVersionSchema,
} from '@shared/schemas';

// Import services
import { ProvinceService } from './services/province.service';
import { DistrictService } from './services/district.service';
import { WardService } from './services/ward.service';
import { AddressService } from './services/address.service';
import { GeometryUtilService } from './services/geometry-util.service';
import { GeometryVersionService } from './services/geometry-version.service';

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
import { RegionController } from './controllers/region.controller';

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
      { name: Role.name, schema: RoleSchema },
      { name: GeometryVersion.name, schema: GeometryVersionSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LoggerModule,
  ],
  controllers: [
    ProvinceController,
    DistrictController,
    WardController,
    AddressController,
    HealthController,
    RegionController,
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
    GeometryUtilService,
    GeometryVersionService,
  ],
})
export class CommonServiceModule {}
