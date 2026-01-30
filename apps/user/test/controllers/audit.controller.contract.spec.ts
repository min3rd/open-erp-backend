/**
 * Contract tests for User Audit Log API endpoints
 * These tests verify that API responses conform to the standardized envelope format
 */

import { ResponseValidator } from '@shared/response';

describe('User Audit Log API Contract Tests', () => {
  describe('List User Audit Logs Response', () => {
    it('should validate successful paginated audit logs response', () => {
      const response = {
        success: true,
        message: 'User audit logs retrieved successfully',
        error: null,
        data: {
          items: [
            {
              id: '507f1f77bcf86cd799439011',
              action: 'user.password.changed',
              resource: 'user',
              timestamp: '2024-01-15T10:30:00.000Z',
              ipAddress: '192.168.1.1',
              status: 'success',
              description: 'User password changed',
            },
            {
              id: '507f1f77bcf86cd799439012',
              action: 'user.profile.updated',
              resource: 'user',
              timestamp: '2024-01-14T09:20:00.000Z',
              ipAddress: '192.168.1.2',
              status: 'success',
              description: 'User profile updated',
            },
          ],
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
          query: {
            q: 'password',
          },
          sort: {
            by: 'createdAt',
            order: 'desc',
          },
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate empty audit logs response', () => {
      const response = {
        success: true,
        message: 'User audit logs retrieved successfully',
        error: null,
        data: {
          items: [],
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate audit logs with filters', () => {
      const response = {
        success: true,
        message: 'User audit logs retrieved successfully',
        error: null,
        data: {
          items: [
            {
              id: '507f1f77bcf86cd799439011',
              action: 'user.password.reset.admin',
              resource: 'user',
              timestamp: '2024-01-15T10:30:00.000Z',
              ipAddress: '192.168.1.1',
              status: 'success',
              description: 'Admin reset user password',
            },
          ],
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          sort: {
            by: 'createdAt',
            order: 'desc',
          },
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Get Audit Log Detail Response', () => {
    it('should validate successful audit log detail response', () => {
      const response = {
        success: true,
        message: 'Audit log retrieved successfully',
        error: null,
        data: {
          mode: 'get',
          item: {
            id: '507f1f77bcf86cd799439011',
            action: 'user.password.changed',
            resource: 'user',
            timestamp: '2024-01-15T10:30:00.000Z',
            ipAddress: '192.168.1.1',
            status: 'success',
            description: 'User password changed',
            payload: {
              passwordChangedAt: '2024-01-15T10:30:00.000Z',
            },
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            metadata: {
              requestId: 'req-123',
              sessionId: 'sess-456',
            },
            performedBy: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439011',
          },
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate audit log detail without optional fields', () => {
      const response = {
        success: true,
        message: 'Audit log retrieved successfully',
        error: null,
        data: {
          mode: 'get',
          item: {
            id: '507f1f77bcf86cd799439011',
            action: 'user.login',
            resource: 'user',
            timestamp: '2024-01-15T10:30:00.000Z',
            status: 'success',
            userId: '507f1f77bcf86cd799439011',
          },
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate failed action audit log', () => {
      const response = {
        success: true,
        message: 'Audit log retrieved successfully',
        error: null,
        data: {
          mode: 'get',
          item: {
            id: '507f1f77bcf86cd799439011',
            action: 'user.login.failed',
            resource: 'user',
            timestamp: '2024-01-15T10:30:00.000Z',
            ipAddress: '192.168.1.100',
            status: 'failure',
            description: 'Failed login attempt - invalid password',
            userId: '507f1f77bcf86cd799439011',
          },
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Error Responses', () => {
    it('should validate USER_NOT_FOUND error response', () => {
      const response = {
        success: false,
        message: 'User not found',
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          details: {
            identifier: 'nonexistent@example.com',
          },
          timestamp: '2024-01-15T10:30:00.000Z',
        },
        data: null,
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate AUDIT_LOG_NOT_FOUND error response', () => {
      const response = {
        success: false,
        message: 'Audit log not found',
        error: {
          code: 'AUDIT_LOG_NOT_FOUND',
          message: 'Audit log not found',
          details: {
            id: '507f1f77bcf86cd799439011',
          },
          timestamp: '2024-01-15T10:30:00.000Z',
        },
        data: null,
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate AUTH_INSUFFICIENT_PERMISSIONS error response', () => {
      const response = {
        success: false,
        message:
          'Insufficient permissions. Required: organization.manage_users_and_orgs (any)',
        error: {
          code: 'AUTH_INSUFFICIENT_PERMISSIONS',
          message:
            'Insufficient permissions. Required: organization.manage_users_and_orgs (any)',
          details: {
            requiredPermissions: [
              'organization.manage_users_and_orgs',
              'organization.manage_org_users',
            ],
            mode: 'any',
            scope: 'global',
          },
          timestamp: '2024-01-15T10:30:00.000Z',
        },
        data: null,
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
