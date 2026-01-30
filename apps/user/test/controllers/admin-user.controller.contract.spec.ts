/**
 * Contract tests for Admin User Management API endpoints
 * These tests verify that API responses conform to the standardized envelope format
 */

import { ResponseValidator } from '@shared/response';

describe('Admin User Management API Contract Tests', () => {
  describe('Reset Password Response', () => {
    it('should validate successful reset password response', () => {
      const response = {
        success: true,
        message: 'Password reset successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          generatedPassword: 'Abc123XyzDef456!',
          emailSent: true,
          sessionsRevoked: true,
          tokenVersion: 1,
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate reset password response without generated password', () => {
      const response = {
        success: true,
        message: 'Password reset successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          emailSent: true,
          sessionsRevoked: true,
          tokenVersion: 1,
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Revoke Sessions Response', () => {
    it('should validate successful revoke sessions response', () => {
      const response = {
        success: true,
        message: 'Sessions revoked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          tokensRevoked: 3,
          tokenVersion: 2,
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Block User Response', () => {
    it('should validate successful block user response', () => {
      const response = {
        success: true,
        message: 'User blocked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          blockedAt: '2024-01-15T10:30:00.000Z',
          reason: 'Violation of terms of service',
          emailSent: true,
          sessionsRevoked: true,
        },
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Unblock User Response', () => {
    it('should validate successful unblock user response', () => {
      const response = {
        success: true,
        message: 'User unblocked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          emailSent: true,
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

    it('should validate USER_ALREADY_BLOCKED error response', () => {
      const response = {
        success: false,
        message: 'User is already blocked',
        error: {
          code: 'USER_ALREADY_BLOCKED',
          message: 'User is already blocked',
          details: {
            userId: '507f1f77bcf86cd799439011',
          },
          timestamp: '2024-01-15T10:30:00.000Z',
        },
        data: null,
      };

      const validation = ResponseValidator.validateEnvelope(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate USER_NOT_BLOCKED error response', () => {
      const response = {
        success: false,
        message: 'User is not blocked',
        error: {
          code: 'USER_NOT_BLOCKED',
          message: 'User is not blocked',
          details: {
            userId: '507f1f77bcf86cd799439011',
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
