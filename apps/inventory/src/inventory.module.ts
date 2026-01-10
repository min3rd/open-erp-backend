import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

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
  Organization,
  OrganizationSchema,
  User,
  UserSchema,
} from '@shared/schemas';

// Import services
import { ProductService } from './services/product.service';
import { InventoryService } from './services/inventory.service';

// Import repositories
import { ProductRepository } from './repositories/product.repository';
import { ProductVersionRepository } from './repositories/product-version.repository';
import { InventoryStockRepository } from './repositories/inventory-stock.repository';
import { InventoryTransactionRepository } from './repositories/inventory-transaction.repository';

// Import controllers
import { ProductController } from './controllers/product.controller';
import { InventoryController } from './controllers/inventory.controller';
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
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Support both MONGODB_URI and separate user/password credentials
        let uri = configService.get<string>('MONGODB_URI');
        
        if (!uri) {
          // Build URI from separate components
          const host = configService.get<string>('MONGODB_HOST') || 'localhost';
          const port = configService.get<string>('MONGODB_PORT') || '27017';
          const user = configService.get<string>('MONGODB_USER');
          const password = configService.get<string>('MONGODB_PASSWORD');
          
          if (user && password) {
            uri = `mongodb://${user}:${password}@${host}:${port}`;
          } else {
            uri = `mongodb://${host}:${port}`;
          }
        }
        
        return {
          uri,
          dbName: configService.get<string>('MONGODB_DB_NAME') || 'open_erp',
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductVersion.name, schema: ProductVersionSchema },
      { name: InventoryStock.name, schema: InventoryStockSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [ProductController, InventoryController, HealthController],
  providers: [
    ProductService,
    InventoryService,
    ProductRepository,
    ProductVersionRepository,
    InventoryStockRepository,
    InventoryTransactionRepository,
    AuthorizationService,
    PermissionService,
  ],
})
export class InventoryModule {}
