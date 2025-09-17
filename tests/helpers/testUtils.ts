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
}) => {
  return generateJWT(payload);
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