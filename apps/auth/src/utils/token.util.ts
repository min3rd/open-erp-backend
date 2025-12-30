import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a 6-digit verification code
 * @returns 6-digit verification code as string
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate expiration time for verification token
 * @param minutes - Number of minutes until expiration
 * @returns Date object representing expiration time
 */
export function getTokenExpiration(minutes: number = 15): Date {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + minutes);
  return expirationDate;
}

/**
 * Generate JWT access token
 * @param userId - User ID
 * @param email - User email
 * @param secret - JWT secret key
 * @param expiresIn - Token expiration time (e.g., '15m', '1h')
 * @returns JWT access token
 */
export function generateAccessToken(
  userId: string,
  email: string,
  secret: string,
  expiresIn: string | number = '15m',
): string {
  const payload = {
    sub: userId,
    email,
    type: 'access',
  };
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

/**
 * Generate refresh token (UUID-based)
 * @returns Refresh token string
 */
export function generateRefreshToken(): string {
  return uuidv4();
}

/**
 * Calculate expiration date based on duration string
 * @param duration - Duration string (e.g., '7d', '30d', '90d')
 * @returns Date object representing expiration time
 */
export function calculateExpirationDate(duration: string): Date {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      'Invalid duration format. Use format like "15m", "1h", "7d"',
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const expirationDate = new Date();

  switch (unit) {
    case 's':
      expirationDate.setSeconds(expirationDate.getSeconds() + value);
      break;
    case 'm':
      expirationDate.setMinutes(expirationDate.getMinutes() + value);
      break;
    case 'h':
      expirationDate.setHours(expirationDate.getHours() + value);
      break;
    case 'd':
      expirationDate.setDate(expirationDate.getDate() + value);
      break;
  }

  return expirationDate;
}

/**
 * Verify JWT token
 * @param token - JWT token to verify
 * @param secret - JWT secret key
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string, secret: string): any {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
