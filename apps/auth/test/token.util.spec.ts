import { generateVerificationCode, getTokenExpiration } from '../src/utils/token.util';

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
      const allDifferent = code1 !== code2 || code2 !== code3 || code1 !== code3;
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
});
