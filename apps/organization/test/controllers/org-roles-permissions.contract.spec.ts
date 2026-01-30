/**
 * Contract tests for Organization Roles and Permissions API endpoints
 * These tests verify that API responses conform to the standardized envelope format
 */

import { ResponseValidator } from '@shared/response';

describe('Organization Roles and Permissions API Contract Tests', () => {
  describe('GET /orgs/roles', () => {
    it('should validate organization roles response format', () => {
      const response = {
        success: true,
        message: 'Organization roles retrieved successfully',
        error: null,
        data: [
          {
            code: 'ORGANIZATION_ADMIN',
            name: 'Organization Admin',
            description: 'Organization administrator with full control',
            scope: 'organization',
          },
          {
            code: 'MANAGER',
            name: 'Manager',
            description: 'Department or team manager',
            scope: 'organization',
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
      expect(response.data[0]).toHaveProperty('scope');
      expect(response.data[0].scope).toBe('organization');
    });

    it('should validate empty organization roles response', () => {
      const response = {
        success: true,
        message: 'Organization roles retrieved successfully',
        error: null,
        data: [],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('GET /orgs/permissions', () => {
    it('should validate organization permissions response format', () => {
      const response = {
        success: true,
        message: 'Organization permissions retrieved successfully',
        error: null,
        data: [
          {
            code: 'organization.manage_org_users',
            resource: 'organization',
            action: 'manage_org_users',
            name: 'Manage Org Users',
            description: 'Manage users within an organization',
            scope: 'organization',
          },
          {
            code: 'department.create',
            resource: 'department',
            action: 'create',
            name: 'Create Department',
            description: 'Permission to create departments',
            scope: 'organization',
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
      expect(response.data[0]).toHaveProperty('scope');
      expect(response.data[0].scope).toBe('organization');
    });

    it('should validate empty organization permissions response', () => {
      const response = {
        success: true,
        message: 'Organization permissions retrieved successfully',
        error: null,
        data: [],
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
