import {
  generateVerificationCode,
  getTokenExpiration,
  generateAccessToken,
  generateRefreshToken,
  calculateExpirationDate,
  verifyToken,
  hashToken,
  hashRefreshToken,
} from '../src/utils/token.util';
import * as jwt from 'jsonwebtoken';

describe('Token Utility', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = generateVerificationCode();

      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      const code3 = generateVerificationCode();

      // At least one should be different (very high probability)
      const allDifferent =
        code1 !== code2 || code2 !== code3 || code1 !== code3;
      expect(allDifferent).toBe(true);
    });

    it('should not generate codes starting with 0', () => {
      // Generate multiple codes to test
      for (let i = 0; i < 10; i++) {
        const code = generateVerificationCode();
        const firstDigit = parseInt(code[0]);
        expect(firstDigit).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('getTokenExpiration', () => {
    it('should return a date in the future with default 15 minutes', () => {
      const now = new Date();
      const expiration = getTokenExpiration();

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(now.getTime());

      // Should be approximately 15 minutes in the future (within 1 second tolerance)
      const diff = expiration.getTime() - now.getTime();
      const expectedDiff = 15 * 60 * 1000; // 15 minutes in milliseconds
      expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
    });

    it('should return correct expiration for custom minutes', () => {
      const now = new Date();
      const minutes = 30;
      const expiration = getTokenExpiration(minutes);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(now.getTime());

      // Should be approximately 30 minutes in the future
      const diff = expiration.getTime() - now.getTime();
      const expectedDiff = minutes * 60 * 1000;
      expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
    });

    it('should handle edge case of 0 minutes', () => {
      const now = new Date();
      const expiration = getTokenExpiration(0);

      expect(expiration).toBeInstanceOf(Date);
      // Should be very close to now (within 1 second)
      const diff = Math.abs(expiration.getTime() - now.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should handle large minute values', () => {
      const now = new Date();
      const minutes = 1440; // 24 hours
      const expiration = getTokenExpiration(minutes);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(now.getTime());

      const diff = expiration.getTime() - now.getTime();
      const expectedDiff = minutes * 60 * 1000;
      expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
    });
  });

  describe('generateAccessToken', () => {
    const testSecret = 'test-secret-key';
    const testUserId = '507f1f77bcf86cd799439011';
    const testEmail = 'test@example.com';

    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const decoded: any = jwt.verify(token, testSecret);

      expect(decoded.sub).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.type).toBe('access');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should respect custom expiration time', () => {
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testSecret,
        '1h',
      );
      const decoded: any = jwt.verify(token, testSecret);

      const expectedExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      expect(Math.abs(decoded.exp - expectedExp)).toBeLessThan(5); // Within 5 seconds tolerance
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken(
        'user1',
        'user1@example.com',
        testSecret,
      );
      const token2 = generateAccessToken(
        'user2',
        'user2@example.com',
        testSecret,
      );

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      // Should be hex (0-9, a-f)
      expect(token).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      const token3 = generateRefreshToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });
  });

  describe('calculateExpirationDate', () => {
    it('should calculate expiration for seconds', () => {
      const now = new Date();
      const duration = '30s';
      const expiration = calculateExpirationDate(duration);

      const diff = expiration.getTime() - now.getTime();
      expect(Math.abs(diff - 30000)).toBeLessThan(1000); // 30 seconds
    });

    it('should calculate expiration for minutes', () => {
      const now = new Date();
      const duration = '15m';
      const expiration = calculateExpirationDate(duration);

      const diff = expiration.getTime() - now.getTime();
      expect(Math.abs(diff - 900000)).toBeLessThan(1000); // 15 minutes
    });

    it('should calculate expiration for hours', () => {
      const now = new Date();
      const duration = '2h';
      const expiration = calculateExpirationDate(duration);

      const diff = expiration.getTime() - now.getTime();
      expect(Math.abs(diff - 7200000)).toBeLessThan(1000); // 2 hours
    });

    it('should calculate expiration for days', () => {
      const now = new Date();
      const duration = '7d';
      const expiration = calculateExpirationDate(duration);

      const diff = expiration.getTime() - now.getTime();
      expect(Math.abs(diff - 604800000)).toBeLessThan(1000); // 7 days
    });

    it('should throw error for invalid duration format', () => {
      expect(() => calculateExpirationDate('invalid')).toThrow(
        'Invalid duration format',
      );
      expect(() => calculateExpirationDate('15')).toThrow(
        'Invalid duration format',
      );
      expect(() => calculateExpirationDate('15x')).toThrow(
        'Invalid duration format',
      );
    });
  });

  describe('verifyToken', () => {
    const testSecret = 'test-secret-key';
    const testUserId = '507f1f77bcf86cd799439011';
    const testEmail = 'test@example.com';

    it('should verify valid token', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const decoded = verifyToken(token, testSecret);

      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.type).toBe('access');
    });

    it('should return null for invalid token signature', () => {
      const token = generateAccessToken(testUserId, testEmail, testSecret);
      const decoded = verifyToken(token, 'wrong-secret');

      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = verifyToken('invalid.token.string', testSecret);

      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create token with very short expiration
      const token = generateAccessToken(
        testUserId,
        testEmail,
        testSecret,
        '1ms',
      );

      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const decoded = verifyToken(token, testSecret);
          expect(decoded).toBeNull();
          resolve(undefined);
        }, 100);
      });
    });
  });

  describe('hashToken', () => {
    it('should hash a token using SHA256', () => {
      const token = 'test-token-string';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should produce the same hash for the same input', () => {
      const token = 'test-token-string';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashRefreshToken', () => {
    const testSecret = 'test-secret-key';

    it('should hash a refresh token using HMAC-SHA256', () => {
      const token = 'test-refresh-token';
      const hash = hashRefreshToken(token, testSecret);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // HMAC-SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should produce the same hash for the same input and secret', () => {
      const token = 'test-refresh-token';
      const hash1 = hashRefreshToken(token, testSecret);
      const hash2 = hashRefreshToken(token, testSecret);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'test-refresh-token-1';
      const token2 = 'test-refresh-token-2';
      const hash1 = hashRefreshToken(token1, testSecret);
      const hash2 = hashRefreshToken(token2, testSecret);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different secrets', () => {
      const token = 'test-refresh-token';
      const hash1 = hashRefreshToken(token, 'secret1');
      const hash2 = hashRefreshToken(token, 'secret2');

      expect(hash1).not.toBe(hash2);
    });

    it('should use JWT_SECRET from env if no secret provided', () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'env-secret';

      const token = 'test-refresh-token';
      const hash1 = hashRefreshToken(token);
      const hash2 = hashRefreshToken(token, 'env-secret');

      expect(hash1).toBe(hash2);

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it('should be more secure than plain SHA256 (different output)', () => {
      const token = 'test-refresh-token';
      const plainHash = hashToken(token);
      const hmacHash = hashRefreshToken(token, testSecret);

      // HMAC and plain hash should be different
      expect(plainHash).not.toBe(hmacHash);
    });
  });
});
