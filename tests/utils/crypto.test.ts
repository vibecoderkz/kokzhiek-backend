import {
  hashPassword,
  comparePassword,
  generateJWT,
  verifyJWT,
  generateRandomToken,
  generateRegistrationKey,
  hashToken
} from '../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$') || hash.startsWith('$2a$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateJWT', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'student' as const,
      };

      const token = generateJWT(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyJWT', () => {
    it('should verify and decode valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'student' as const,
      };

      const token = generateJWT(payload);
      const decoded = verifyJWT(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => verifyJWT(invalidToken)).toThrow();
    });
  });

  describe('generateRandomToken', () => {
    it('should generate random token', () => {
      const token = generateRandomToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    });

    it('should generate different tokens each time', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRegistrationKey', () => {
    it('should generate registration key with default prefix', () => {
      const key = generateRegistrationKey();

      expect(key).toBeDefined();
      expect(key.startsWith('REG-')).toBe(true);
      expect(key.includes(new Date().getFullYear().toString())).toBe(true);
    });

    it('should generate registration key with custom prefix', () => {
      const customPrefix = 'CUSTOM';
      const key = generateRegistrationKey(customPrefix);

      expect(key.startsWith(`${customPrefix}-`)).toBe(true);
      expect(key.includes(new Date().getFullYear().toString())).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateRegistrationKey();
      const key2 = generateRegistrationKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('hashToken', () => {
    it('should hash token consistently', () => {
      const token = 'test-token-string';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
      expect(hash1).not.toBe(token);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';

      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);

      expect(hash1).not.toBe(hash2);
    });
  });
});