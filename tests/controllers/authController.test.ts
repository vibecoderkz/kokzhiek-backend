import request from 'supertest';
import app from '../../src/app';
import { AuthService } from '../../src/services/authService';
import { RegistrationKeyService } from '../../src/services/registrationKeyService';
import { createMockUser, createMockRegistrationKey, expectErrorResponse, expectSuccessResponse } from '../helpers/testUtils';

jest.mock('../../src/config/database');
jest.mock('../../src/services/authService');
jest.mock('../../src/services/registrationKeyService');

const MockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const MockRegistrationKeyService = RegistrationKeyService as jest.MockedClass<typeof RegistrationKeyService>;

describe('AuthController', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = new MockAuthService() as jest.Mocked<AuthService>;
    (AuthService as any).mockImplementation(() => mockAuthService);
  });

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      registrationKey: 'TEST-2024-ABC123',
    };

    it('should register user successfully', async () => {
      const mockUser = createMockUser();
      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        message: 'Registration successful',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(validRegisterData.email);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should return validation error for weak password', async () => {
      const invalidData = { ...validRegisterData, password: 'weak' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should return error if registration key is missing', async () => {
      const invalidData = { ...validRegisterData, registrationKey: '' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'TestPass123!',
    };

    it('should login user successfully', async () => {
      const mockUser = createMockUser();
      mockAuthService.login.mockResolvedValue({
        token: 'mock-jwt-token',
        user: mockUser,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      expectSuccessResponse(response, 200);
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(response.body.data.user.email).toBe(validLoginData.email);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should return validation error for empty password', async () => {
      const invalidData = { ...validLoginData, password: '' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'Password reset email sent if account exists',
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expectSuccessResponse(response, 200);
      expect(response.body.message).toContain('Password reset email sent');
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    const validResetData = {
      token: 'valid-reset-token',
      newPassword: 'NewPass123!',
    };

    it('should reset password successfully', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successful',
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(validResetData);

      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Password reset successful');
    });

    it('should return validation error for weak password', async () => {
      const invalidData = { ...validResetData, newPassword: 'weak' };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(invalidData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should verify email successfully', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-verification-token' });

      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Email verified successfully');
    });

    it('should return validation error for empty token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: '' });

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/validate-key', () => {
    it('should validate registration key successfully', async () => {
      const mockKey = createMockRegistrationKey();
      (MockRegistrationKeyService.validateRegistrationKey as jest.Mock).mockResolvedValue({
        valid: true,
        keyInfo: mockKey,
      });

      const response = await request(app)
        .post('/api/auth/validate-key')
        .send({ registrationKey: 'TEST-2024-ABC123' });

      expectSuccessResponse(response, 200);
      expect(response.body.data.keyInfo).toBeDefined();
      expect(response.body.data.keyInfo.role).toBe(mockKey.role);
    });

    it('should return error for invalid registration key', async () => {
      (MockRegistrationKeyService.validateRegistrationKey as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Registration key not found',
      });

      const response = await request(app)
        .post('/api/auth/validate-key')
        .send({ registrationKey: 'INVALID-KEY' });

      expectErrorResponse(response, 400, 'INVALID_REGISTRATION_KEY');
    });

    it('should return validation error for empty registration key', async () => {
      const response = await request(app)
        .post('/api/auth/validate-key')
        .send({ registrationKey: '' });

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const mockToken = 'Bearer valid-jwt-token';

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', mockToken);

      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should return error without authentication token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });
  });
});