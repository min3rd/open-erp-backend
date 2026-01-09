import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigServiceModule } from '../src/config-service.module';
import { NavigationScope } from '../src/schemas/navigation.schema';
import { Role } from '@shared/types';

describe('Navigation API (e2e)', () => {
  let app: INestApplication;

  // Mock JWT tokens for testing
  const mockTokens = {
    systemAdmin: 'mock-system-admin-token',
    user: 'mock-user-token',
    navAdmin: 'mock-nav-admin-token',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/navigations/user', () => {
    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .get('/v1/navigations/user')
        .expect(401);
    });

    it('should return navigation in tree format by default', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mode', 'get');
      expect(response.body.data.item).toHaveProperty('items');
      expect(response.body.data.item).toHaveProperty('format', 'tree');
      expect(response.body.data.item).toHaveProperty('scope', 'global');
      expect(Array.isArray(response.body.data.item.items)).toBe(true);
    });

    it('should return navigation in flat format when requested', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user?format=flat')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.item).toHaveProperty('format', 'flat');
      expect(Array.isArray(response.body.data.item.items)).toBe(true);

      // Flat format should not have nested items
      const items = response.body.data.item.items;
      if (items.length > 0) {
        items.forEach((item: any) => {
          expect(item.items).toBeUndefined();
        });
      }
    });

    it('should support module scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user?scope=module&moduleId=inventory')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body.data.item).toHaveProperty('scope', 'module');
      expect(response.body.data.item).toHaveProperty('module', 'inventory');
    });

    it('should return 400 when moduleId is missing for module scope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user?scope=module')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should include ETag in response headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('etag');
      expect(typeof response.body.meta.etag).toBe('string');
    });

    it('should return 304 when ETag matches', async () => {
      // First request to get ETag
      const firstResponse = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      const etag = firstResponse.body.meta.etag;

      // Second request with If-None-Match header
      const secondResponse = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .set('If-None-Match', etag);

      expect(secondResponse.status).toBe(304);
    });
  });

  describe('GET /v1/navigations/preview', () => {
    it('should return 403 for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/v1/navigations/preview?asRole=USER')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(403);
    });

    it('should allow system admin to preview navigation', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/preview?asRole=USER')
        .set('Authorization', `Bearer ${mockTokens.systemAdmin}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.item).toHaveProperty('previewRole', 'USER');
      expect(response.body.data.item).toHaveProperty('items');
    });

    it('should support format parameter in preview', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/preview?asRole=USER&format=flat')
        .set('Authorization', `Bearer ${mockTokens.systemAdmin}`)
        .expect(200);

      expect(response.body.data.item).toHaveProperty('format', 'flat');
    });

    it('should support scope and moduleId in preview', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/v1/navigations/preview?asRole=USER&scope=module&moduleId=inventory',
        )
        .set('Authorization', `Bearer ${mockTokens.systemAdmin}`)
        .expect(200);

      expect(response.body.data.item).toHaveProperty('scope', 'module');
      expect(response.body.data.item).toHaveProperty('module', 'inventory');
    });
  });

  describe('GET /v1/navigations/global', () => {
    it('should return global navigation', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/global')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.item).toHaveProperty('scope', 'global');
      expect(response.body.data.item).toHaveProperty('items');
    });

    it('should support permissions parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/global?permissions=user.read,user.write')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /v1/navigations/module/:moduleId', () => {
    it('should return module-specific navigation', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/module/inventory')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.item).toHaveProperty('scope', 'module');
      expect(response.body.data.item).toHaveProperty('module', 'inventory');
    });
  });

  describe('Response Format Validation', () => {
    it('should follow standardized API response envelope', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('data');

      expect(typeof response.body.success).toBe('boolean');
      expect(
        response.body.message === null || typeof response.body.message === 'string',
      ).toBe(true);
      expect(response.body.error).toBeNull();
      expect(response.body.data).toBeTruthy();

      // Validate data structure
      expect(response.body.data).toHaveProperty('mode');
      expect(response.body.data).toHaveProperty('item');
    });

    it('should include appropriate metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/user')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      if (response.body.meta) {
        expect(typeof response.body.meta).toBe('object');
      }
    });
  });

  describe('GET /v1/navigations/search', () => {
    it('should search navigation items', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/search?q=dashboard')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.item)).toBe(true);
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/navigations/search?q=')
        .set('Authorization', `Bearer ${mockTokens.user}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
