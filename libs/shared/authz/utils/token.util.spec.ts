import { verifyToken, extractBearerToken, generateRandomSecret, JwtPayload } from './token.util';
import * as jwt from 'jsonwebtoken';

describe('Token Utilities', () => {
  const testSecret = 'test-secret-key';
  
  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
      };
      const token = jwt.sign(payload, testSecret);
      
      const decoded = verifyToken(token, testSecret);
      
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.string', testSecret);
      
      expect(decoded).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
      };
      const token = jwt.sign(payload, testSecret);
      
      const decoded = verifyToken(token, 'wrong-secret');
      
      expect(decoded).toBeNull();
    });

    it('should return null for expired token', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
      };
      const token = jwt.sign(payload, testSecret, { expiresIn: '0s' });
      
      // Wait a bit for token to expire
      const decoded = verifyToken(token, testSecret);
      
      expect(decoded).toBeNull();
    });

    it('should decode token with all optional fields', () => {
      const payload: JwtPayload = {
        sub: 'user123',
        email: 'test@example.com',
        organizationId: 'org456',
        roles: ['USER', 'ADMIN'],
        type: 'access',
      };
      const token = jwt.sign(payload, testSecret);
      
      const decoded = verifyToken(token, testSecret);
      
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.organizationId).toBe('org456');
      expect(decoded?.roles).toEqual(['USER', 'ADMIN']);
      expect(decoded?.type).toBe('access');
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractBearerToken('Bearer my-token-123');
      
      expect(token).toBe('my-token-123');
    });

    it('should return null for missing header', () => {
      const token = extractBearerToken(undefined);
      
      expect(token).toBeNull();
    });

    it('should return null for invalid format (no Bearer)', () => {
      const token = extractBearerToken('my-token-123');
      
      expect(token).toBeNull();
    });

    it('should return null for invalid format (wrong type)', () => {
      const token = extractBearerToken('Basic my-token-123');
      
      expect(token).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const token = extractBearerToken('Bearer ');
      
      expect(token).toBeNull();
    });

    it('should return null for Bearer only', () => {
      const token = extractBearerToken('Bearer');
      
      expect(token).toBeNull();
    });
  });

  describe('generateRandomSecret', () => {
    it('should generate a random secret', () => {
      const secret = generateRandomSecret();
      
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('should generate different secrets on each call', () => {
      const secret1 = generateRandomSecret();
      const secret2 = generateRandomSecret();
      
      expect(secret1).not.toBe(secret2);
    });

    it('should generate hex string', () => {
      const secret = generateRandomSecret();
      
      // Hex strings only contain 0-9 and a-f
      expect(secret).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate 64-character secret (32 bytes in hex)', () => {
      const secret = generateRandomSecret();
      
      expect(secret.length).toBe(64);
    });
  });
});
