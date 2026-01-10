import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { InventoryModule } from '../src/inventory.module';
import {
  ProductScope,
  ProductType,
  ProductStatus,
  Unit,
  HazardLevel,
} from '@shared/constants';

describe('Product API Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let createdProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), InventoryModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Mock user ID for testing
    testUserId = '507f1f77bcf86cd799439011';
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('POST /products', () => {
    it('should create a new product with valid data', async () => {
      const createDto = {
        sku: 'TEST-001',
        name: 'Test Product',
        description: 'Test product description',
        scope: ProductScope.ORGANIZATION,
        organizationId: '507f1f77bcf86cd799439012',
        type: ProductType.FINISHED_GOOD,
        status: ProductStatus.ACTIVE,
        unit: Unit.PIECE,
        hazardLevel: HazardLevel.NONE,
        minStockLevel: 10,
        createdBy: testUserId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.mode).toBe('create');
      expect(response.body.data.item).toBeDefined();
      expect(response.body.data.item.sku).toBe(createDto.sku);
      expect(response.body.data.item.name).toBe(createDto.name);
      expect(response.body.data.item.currentVersion).toBe(1);

      createdProductId = response.body.data.item.id;
    });

    it('should fail to create product with duplicate SKU', async () => {
      const createDto = {
        sku: 'TEST-001',
        name: 'Duplicate Product',
        scope: ProductScope.ORGANIZATION,
        organizationId: '507f1f77bcf86cd799439012',
        type: ProductType.FINISHED_GOOD,
        status: ProductStatus.ACTIVE,
        unit: Unit.PIECE,
        createdBy: testUserId,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should fail to create product without required fields', async () => {
      const createDto = {
        name: 'Invalid Product',
        // Missing sku, scope, type, unit
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(createDto)
        .expect(400);
    });
  });

  describe('GET /products', () => {
    it('should retrieve paginated list of products', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should filter products by scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ scope: ProductScope.ORGANIZATION })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.items.every(
          (item: any) => item.scope === ProductScope.ORGANIZATION,
        ),
      ).toBe(true);
    });
  });

  describe('GET /products/:id', () => {
    it('should retrieve a product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mode).toBe('get');
      expect(response.body.data.item.id).toBe(createdProductId);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439099';
      await request(app.getHttpServer()).get(`/products/${fakeId}`).expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product and create a new version', async () => {
      const updateDto = {
        name: 'Updated Test Product',
        description: 'Updated description',
        minStockLevel: 20,
        updatedBy: testUserId,
        changeReason: 'Updated stock level',
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${createdProductId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(response.body.data.item.name).toBe(updateDto.name);
      expect(response.body.data.item.currentVersion).toBe(2);
    });
  });

  describe('GET /products/:id/versions', () => {
    it('should retrieve version history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}/versions`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(2); // At least 2 versions
    });
  });

  describe('GET /products/:id/versions/:version', () => {
    it('should retrieve a specific version', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${createdProductId}/versions/1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.item.version).toBe(1);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should soft delete a product', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/products/${createdProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
    });

    it('should not find soft-deleted product in default queries', async () => {
      await request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(404);
    });
  });

  describe('POST /products/:id/restore', () => {
    it('should restore a soft-deleted product', async () => {
      const response = await request(app.getHttpServer())
        .post(`/products/${createdProductId}/restore`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.item.status).toBe(ProductStatus.ACTIVE);
    });
  });
});
