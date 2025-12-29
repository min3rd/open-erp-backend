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
