import { AuthService } from '../../src/services/authService';
import { RegistrationKeyService } from '../../src/services/registrationKeyService';
import { EmailService } from '../../src/services/emailService';
import { createMockUser, createMockRegistrationKey } from '../helpers/testUtils';
import * as crypto from '../../src/utils/crypto';

jest.mock('../../src/config/database', () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
      registrationKeys: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(),
        })),
      })),
    })),
  },
}));

jest.mock('../../src/services/registrationKeyService');
jest.mock('../../src/services/emailService');

const { db } = require('../../src/config/database');

describe('AuthService', () => {
  let authService: AuthService;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockEmailService = new EmailService() as jest.Mocked<EmailService>;

    (EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService);
    mockEmailService.sendWelcomeEmail = jest.fn().mockResolvedValue(undefined);
    mockEmailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
  });

  describe('register', () => {
    const validRegisterInput = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      registrationKey: 'TEST-2024-ABC123',
    };

    it('should register a new user successfully', async () => {
      const mockUser = createMockUser();
      const mockKey = createMockRegistrationKey();

      db.query.users.findFirst.mockResolvedValue(null);

      (RegistrationKeyService.validateRegistrationKey as jest.Mock).mockResolvedValue({
        valid: true,
        keyInfo: mockKey,
      });

      (RegistrationKeyService.useRegistrationKey as jest.Mock).mockResolvedValue({
        success: true,
      });

      const mockInsert = {
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([mockUser])
        }))
      };
      db.insert.mockReturnValue(mockInsert);

      jest.spyOn(crypto, 'hashPassword').mockResolvedValue('hashedpassword');
      jest.spyOn(crypto, 'generateRandomToken').mockReturnValue('verification-token');

      const result = await authService.register(validRegisterInput);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(validRegisterInput.email);
      expect(result.message).toContain('Registration successful');
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        validRegisterInput.email,
        validRegisterInput.firstName,
        'verification-token'
      );
    });

    it('should throw error if user already exists', async () => {
      const existingUser = createMockUser();
      db.query.users.findFirst.mockResolvedValue(existingUser);

      await expect(authService.register(validRegisterInput)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if registration key is invalid', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      (RegistrationKeyService.validateRegistrationKey as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid registration key',
      });

      await expect(authService.register(validRegisterInput)).rejects.toThrow('Invalid registration key');
    });
  });

  describe('login', () => {
    const validLoginInput = {
      email: 'test@example.com',
      password: 'TestPass123!',
    };

    it('should login user successfully with valid credentials', async () => {
      const mockUser = createMockUser({
        passwordHash: await crypto.hashPassword('TestPass123!'),
      });

      db.query.users.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(crypto, 'generateJWT').mockReturnValue('mock-jwt-token');

      const result = await authService.login(validLoginInput);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe(validLoginInput.email);
    });

    it('should throw error if user does not exist', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      await expect(authService.login(validLoginInput)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = createMockUser();
      db.query.users.findFirst.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'comparePassword').mockResolvedValue(false);

      await expect(authService.login(validLoginInput)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email if user exists', async () => {
      const mockUser = createMockUser();
      db.query.users.findFirst.mockResolvedValue(mockUser);
      db.update().set().where.mockResolvedValue([mockUser]);

      jest.spyOn(crypto, 'generateRandomToken').mockReturnValue('reset-token');

      const result = await authService.forgotPassword({ email: 'test@example.com' });

      expect(result.message).toContain('Password reset email sent');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        'reset-token'
      );
    });

    it('should return generic message if user does not exist', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      const result = await authService.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result.message).toContain('Password reset email sent');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const mockUser = createMockUser({
        passwordResetToken: 'valid-reset-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      });

      db.query.users.findFirst.mockResolvedValue(mockUser);
      db.update().set().where.mockResolvedValue([mockUser]);

      jest.spyOn(crypto, 'hashPassword').mockResolvedValue('new-hashed-password');

      const result = await authService.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPass123!',
      });

      expect(result.message).toBe('Password reset successful');
    });

    it('should throw error if reset token is invalid', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      await expect(authService.resetPassword({
        token: 'invalid-token',
        newPassword: 'NewPass123!',
      })).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error if reset token is expired', async () => {
      const mockUser = createMockUser({
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      db.query.users.findFirst.mockResolvedValue(mockUser);

      await expect(authService.resetPassword({
        token: 'expired-token',
        newPassword: 'NewPass123!',
      })).rejects.toThrow('Reset token has expired');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const mockUser = createMockUser({
        emailVerificationToken: 'valid-verification-token',
        emailVerified: false,
      });

      db.query.users.findFirst.mockResolvedValue(mockUser);
      db.update().set().where.mockResolvedValue([{ ...mockUser, emailVerified: true }]);

      const result = await authService.verifyEmail('valid-verification-token');

      expect(result.message).toBe('Email verified successfully');
    });

    it('should throw error if verification token is invalid', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow('Invalid verification token');
    });
  });
});