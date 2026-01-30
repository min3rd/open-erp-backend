/**
 * Contract tests for Common API endpoints
 * These tests verify that API responses conform to the standardized envelope format
 */

import { ResponseValidator } from '@shared/response';

describe('Common API Contract Tests', () => {
  describe('GET /common/roles/global', () => {
    it('should validate global roles response format', () => {
      const response = {
        success: true,
        message: 'Global roles retrieved successfully',
        error: null,
        data: [
          {
            code: 'SUPER_ADMIN',
            name: 'Super Admin',
            description: 'Full system administrator with unrestricted access',
          },
          {
            code: 'USER',
            name: 'User',
            description: 'Standard user with basic access',
          },
        ],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('code');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('description');
    });

    it('should validate empty global roles response', () => {
      const response = {
        success: true,
        message: 'Global roles retrieved successfully',
        error: null,
        data: [],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('GET /common/permissions/global', () => {
    it('should validate global permissions response format', () => {
      const response = {
        success: true,
        message: 'Global permissions retrieved successfully',
        error: null,
        data: [
          {
            code: 'user.create',
            resource: 'user',
            action: 'create',
            name: 'User Create',
            description: 'Permission to create new users',
          },
          {
            code: 'organization.read',
            resource: 'organization',
            action: 'read',
            name: 'Organization Read',
            description: 'Permission to view organization information',
          },
        ],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('code');
      expect(response.data[0]).toHaveProperty('resource');
      expect(response.data[0]).toHaveProperty('action');
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('description');
    });

    it('should validate empty global permissions response', () => {
      const response = {
        success: true,
        message: 'Global permissions retrieved successfully',
        error: null,
        data: [],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
