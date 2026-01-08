import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * JWT Payload Interface
 * Describes the structure of decoded JWT tokens
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  organizationId?: string;
  roles?: string[];
  type?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @param secret - JWT secret key
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a random secret for JWT (development/fallback use only)
 * @returns Random hex string suitable for JWT secret
 */
export function generateRandomSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Extracted token or null if invalid format
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}
