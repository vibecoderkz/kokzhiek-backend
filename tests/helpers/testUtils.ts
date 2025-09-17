import { generateJWT, hashPassword, generateRandomToken } from '../../src/utils/crypto';
import { UserRole } from '../../src/types/auth';

export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'student' as UserRole,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockRegistrationKey = (overrides: Partial<any> = {}) => ({
  id: 'test-key-id',
  keyCode: 'TEST-2024-ABC123',
  role: 'student' as UserRole,
  description: 'Test registration key',
  maxUses: 1,
  currentUses: 0,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  isActive: true,
  createdBy: 'admin-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const generateTestJWT = (payload: {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}) => {
  return generateJWT(payload);
};

export const loginAsAdmin = async (app: any) => {
  const request = require('supertest');
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'balinteegor@gmail.com',
      password: 'Tomiris2004!'
    });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  return response.body.data.token;
};

export const createTestUser = async (app: any, role: UserRole = 'author') => {
  const request = require('supertest');

  // First get admin token
  const adminToken = await loginAsAdmin(app);

  // Create a registration key for the role
  const keyResponse = await request(app)
    .post('/api/admin/registration-keys')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role });

  if (keyResponse.status !== 201) {
    throw new Error(`Failed to create registration key: ${keyResponse.status}`);
  }

  const registrationKey = keyResponse.body.data.keyInfo.keyCode;

  // Register the new user
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      email: `test-${role}-${Date.now()}@test.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      registrationKey
    });

  if (registerResponse.status !== 201) {
    throw new Error(`Failed to register user: ${registerResponse.status}`);
  }

  // Login as the new user
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: `test-${role}-${Date.now()}@test.com`,
      password: 'TestPass123!'
    });

  if (loginResponse.status !== 200) {
    throw new Error(`Failed to login as new user: ${loginResponse.status}`);
  }

  return loginResponse.body.data.token;
};

export const createTestPassword = async (password: string = 'TestPass123!') => {
  return hashPassword(password);
};

export const createTestToken = () => {
  return generateRandomToken();
};

export const expectErrorResponse = (response: any, statusCode: number, errorCode: string) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  expect(response.body.error.code).toBe(errorCode);
};

export const expectSuccessResponse = (response: any, statusCode: number = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
};