import {
  generateStrongPassword,
  isStrongPassword,
} from '../../src/utils/password-generator.util';

describe('Password Generator Utility', () => {
  describe('generateStrongPassword', () => {
    it('should generate password with default length of 16', () => {
      const password = generateStrongPassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password with custom length', () => {
      const length = 20;
      const password = generateStrongPassword(length);
      expect(password).toHaveLength(length);
    });

    it('should generate password with at least one uppercase letter', () => {
      const password = generateStrongPassword();
      expect(password).toMatch(/[A-Z]/);
    });

    it('should generate password with at least one lowercase letter', () => {
      const password = generateStrongPassword();
      expect(password).toMatch(/[a-z]/);
    });

    it('should generate password with at least one number', () => {
      const password = generateStrongPassword();
      expect(password).toMatch(/[0-9]/);
    });

    it('should generate password with at least one special character', () => {
      const password = generateStrongPassword();
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });

    it('should generate different passwords on each call', () => {
      const password1 = generateStrongPassword();
      const password2 = generateStrongPassword();
      expect(password1).not.toBe(password2);
    });

    it('should generate strong password that passes validation', () => {
      const password = generateStrongPassword();
      expect(isStrongPassword(password)).toBe(true);
    });

    it('should throw error for length less than 8', () => {
      expect(() => generateStrongPassword(7)).toThrow(
        'Password length must be at least 8 characters',
      );
    });

    it('should throw error for length of 0', () => {
      expect(() => generateStrongPassword(0)).toThrow(
        'Password length must be at least 8 characters',
      );
    });

    it('should throw error for negative length', () => {
      expect(() => generateStrongPassword(-5)).toThrow(
        'Password length must be at least 8 characters',
      );
    });

    it('should successfully generate password with minimum length of 8', () => {
      const password = generateStrongPassword(8);
      expect(password).toHaveLength(8);
      expect(isStrongPassword(password)).toBe(true);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for strong password', () => {
      const strongPassword = 'Abcd1234!@#$';
      expect(isStrongPassword(strongPassword)).toBe(true);
    });

    it('should return false for password without uppercase', () => {
      const password = 'abcd1234!@#$';
      expect(isStrongPassword(password)).toBe(false);
    });

    it('should return false for password without lowercase', () => {
      const password = 'ABCD1234!@#$';
      expect(isStrongPassword(password)).toBe(false);
    });

    it('should return false for password without numbers', () => {
      const password = 'Abcdefgh!@#$';
      expect(isStrongPassword(password)).toBe(false);
    });

    it('should return false for password without special characters', () => {
      const password = 'Abcd1234efgh';
      expect(isStrongPassword(password)).toBe(false);
    });

    it('should return false for password shorter than 8 characters', () => {
      const password = 'Abc12!';
      expect(isStrongPassword(password)).toBe(false);
    });

    it('should return true for minimum valid password', () => {
      const password = 'Abcd123!';
      expect(isStrongPassword(password)).toBe(true);
    });
  });
});
