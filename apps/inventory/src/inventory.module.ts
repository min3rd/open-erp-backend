import { Module } from '@nestjs/common';
import { LoggerModule } from '@shared/logger';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { getDatabaseConfig, getMongooseOptions } from '@shared/database';

// Import schemas
import {
  Product,
  ProductSchema,
  ProductVersion,
  ProductVersionSchema,
  InventoryStock,
  InventoryStockSchema,
  InventoryTransaction,
  InventoryTransactionSchema,
  Warehouse,
  WarehouseSchema,
  Province,
  ProvinceSchema,
  Ward,
  WardSchema,
  Organization,
  OrganizationSchema,
  User,
  UserSchema,
  Role,
  RoleSchema,
} from '@shared/schemas';

// Import services
import { ProductService } from './services/product.service';
import { InventoryService } from './services/inventory.service';
import { WarehouseService } from './services/warehouse.service';

// Import repositories
import { ProductRepository } from './repositories/product.repository';
import { ProductVersionRepository } from './repositories/product-version.repository';
import { InventoryStockRepository } from './repositories/inventory-stock.repository';
import { InventoryTransactionRepository } from './repositories/inventory-transaction.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';

// Import controllers
import { ProductController } from './controllers/product.controller';
import { InventoryController } from './controllers/inventory.controller';
import { HealthController } from './controllers/health.controller';
import { WarehouseController } from './controllers/warehouse.controller';

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
      { name: Product.name, schema: ProductSchema },
      { name: ProductVersion.name, schema: ProductVersionSchema },
      { name: InventoryStock.name, schema: InventoryStockSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: Ward.name, schema: WardSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
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
    ProductController,
    InventoryController,
    HealthController,
    WarehouseController,
  ],
  providers: [
    ProductService,
    InventoryService,
    WarehouseService,
    ProductRepository,
    ProductVersionRepository,
    InventoryStockRepository,
    InventoryTransactionRepository,
    WarehouseRepository,
    AuthorizationService,
    PermissionService,
  ],
})
export class InventoryModule {}
