import request from 'supertest';
import app from '../../src/app';
import { generateTestJWT, createMockUser, expectSuccessResponse, expectErrorResponse } from '../helpers/testUtils';
import { UserRole } from '../../src/types/auth';

describe('Admin Routes', () => {
  let adminToken: string;
  let userToken: string;
  let testRegistrationKey: string;

  beforeAll(() => {
    // Create test tokens
    adminToken = generateTestJWT({
      userId: 'admin-user-id',
      email: 'admin@test.com',
      role: 'admin' as UserRole,
    });

    userToken = generateTestJWT({
      userId: 'regular-user-id',
      email: 'user@test.com',
      role: 'author' as UserRole,
    });
  });

  describe('POST /api/admin/registration-keys', () => {
    it('should create a new registration key with valid data', async () => {
      const keyData = {
        role: 'author',
        description: 'Test key for authors',
        maxUses: 5,
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.keyInfo).toBeDefined();
      expect(response.body.data.keyInfo.role).toBe(keyData.role);
      expect(response.body.data.keyInfo.description).toBe(keyData.description);
      expect(response.body.data.keyInfo.maxUses).toBe(keyData.maxUses);
      expect(response.body.data.keyInfo.keyCode).toBeDefined();
      expect(response.body.data.keyInfo.status).toBe('active');

      // Store key code for other tests
      testRegistrationKey = response.body.data.keyInfo.keyCode;
    });

    it('should create registration key with minimal data', async () => {
      const keyData = {
        role: 'student',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.keyInfo.role).toBe(keyData.role);
      expect(response.body.data.keyInfo.description).toBeNull();
      expect(response.body.data.keyInfo.maxUses).toBeNull();
    });

    it('should create registration key with expiration date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const keyData = {
        role: 'teacher',
        description: 'Expiring teacher key',
        expiresAt: futureDate.toISOString(),
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.keyInfo.expiresAt).toBeDefined();
      expect(new Date(response.body.data.keyInfo.expiresAt)).toBeInstanceOf(Date);
    });

    it('should fail to create registration key without authentication', async () => {
      const keyData = {
        role: 'author',
        description: 'Unauthorized key',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .send(keyData);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to create registration key without admin permission', async () => {
      const keyData = {
        role: 'author',
        description: 'Forbidden key',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send(keyData);

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });

    it('should fail to create registration key with invalid role', async () => {
      const keyData = {
        role: 'invalid_role',
        description: 'Invalid role key',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create registration key with invalid maxUses', async () => {
      const keyData = {
        role: 'author',
        maxUses: 0, // Invalid: must be at least 1
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create registration key without role', async () => {
      const keyData = {
        description: 'Key without role',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(keyData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/admin/registration-keys/bulk', () => {
    it('should create multiple registration keys successfully', async () => {
      const bulkData = {
        role: 'student',
        count: 5,
        description: 'Bulk student keys',
        maxUses: 1,
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.keys).toBeDefined();
      expect(Array.isArray(response.body.data.keys)).toBe(true);
      expect(response.body.data.keys.length).toBe(bulkData.count);
      expect(response.body.data.count).toBe(bulkData.count);

      // Check that all keys are unique
      const uniqueKeys = new Set(response.body.data.keys);
      expect(uniqueKeys.size).toBe(bulkData.count);
    });

    it('should create bulk keys with prefix', async () => {
      const bulkData = {
        role: 'teacher',
        count: 3,
        keyPrefix: 'TEACHER',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.keys.length).toBe(3);

      // Check that all keys start with the prefix
      response.body.data.keys.forEach((key: string) => {
        expect(key.startsWith('TEACHER')).toBe(true);
      });
    });

    it('should fail to create bulk keys without authentication', async () => {
      const bulkData = {
        role: 'student',
        count: 5,
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .send(bulkData);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to create bulk keys without admin permission', async () => {
      const bulkData = {
        role: 'student',
        count: 5,
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bulkData);

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });

    it('should fail to create bulk keys with count too high', async () => {
      const bulkData = {
        role: 'student',
        count: 101, // Exceeds maximum of 100
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create bulk keys with count too low', async () => {
      const bulkData = {
        role: 'student',
        count: 0, // Below minimum of 1
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create bulk keys without count', async () => {
      const bulkData = {
        role: 'student',
      };

      const response = await request(app)
        .post('/api/admin/registration-keys/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/admin/registration-keys', () => {
    it('should get all registration keys with default pagination', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.keys).toBeDefined();
      expect(Array.isArray(response.body.data.keys)).toBe(true);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(20);
    });

    it('should get registration keys with custom pagination', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
      expect(response.body.data.keys.length).toBeLessThanOrEqual(5);
    });

    it('should get registration keys with status filter', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.keys).toBeDefined();

      // Check that all returned keys have active status
      response.body.data.keys.forEach((key: any) => {
        expect(key.status).toBe('active');
      });
    });

    it('should fail to get registration keys without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys');

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to get registration keys without admin permission', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });

    it('should handle pagination with page 0 (should use default)', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.page).toBe(1); // Should default to 1
    });

    it('should cap limit at maximum value', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.limit).toBe(100); // Should be capped at 100
    });
  });

  describe('GET /api/admin/registration-keys/:keyCode', () => {
    it('should get specific registration key details', async () => {
      if (!testRegistrationKey) {
        // Create a key first if not available
        const createResponse = await request(app)
          .post('/api/admin/registration-keys')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'author', description: 'Test key for details' });
        testRegistrationKey = createResponse.body.data.keyInfo.keyCode;
      }

      const response = await request(app)
        .get(`/api/admin/registration-keys/${testRegistrationKey}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.keyInfo).toBeDefined();
      expect(response.body.data.keyInfo.keyCode).toBe(testRegistrationKey);
      expect(response.body.data.keyInfo.id).toBeDefined();
      expect(response.body.data.keyInfo.role).toBeDefined();
      expect(response.body.data.keyInfo.status).toBeDefined();
      expect(response.body.data.keyInfo.usesRemaining).toBeDefined();
    });

    it('should fail to get non-existent registration key', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys/NONEXISTENT-KEY')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'KEY_NOT_FOUND');
    });

    it('should fail to get registration key without authentication', async () => {
      const response = await request(app)
        .get(`/api/admin/registration-keys/${testRegistrationKey}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to get registration key without admin permission', async () => {
      const response = await request(app)
        .get(`/api/admin/registration-keys/${testRegistrationKey}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'AUTHORIZATION_ERROR');
    });
  });

  describe('Registration Key Data Validation', () => {
    it('should return keys with proper structure', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);

      if (response.body.data.keys.length > 0) {
        const key = response.body.data.keys[0];
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('keyCode');
        expect(key).toHaveProperty('role');
        expect(key).toHaveProperty('status');
        expect(key).toHaveProperty('usesRemaining');
        expect(key).toHaveProperty('currentUses');

        // Validate role is one of the expected values
        expect(['admin', 'moderator', 'author', 'school', 'teacher', 'student']).toContain(key.role);

        // Validate status is one of the expected values
        expect(['active', 'expired', 'exhausted', 'inactive']).toContain(key.status);
      }
    });

    it('should handle keys with different roles correctly', async () => {
      const roles = ['admin', 'moderator', 'author', 'school', 'teacher', 'student'];

      for (const role of roles) {
        const response = await request(app)
          .post('/api/admin/registration-keys')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role, description: `Test ${role} key` });

        expectSuccessResponse(response, 201);
        expect(response.body.data.keyInfo.role).toBe(role);
      }
    });
  });

  describe('Registration Key Integration', () => {
    it('should create, retrieve, and validate key flow', async () => {
      // Create a key
      const createResponse = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'teacher',
          description: 'Integration test key',
          maxUses: 3,
        });

      expectSuccessResponse(createResponse, 201);
      const keyCode = createResponse.body.data.keyInfo.keyCode;

      // Retrieve the key
      const getResponse = await request(app)
        .get(`/api/admin/registration-keys/${keyCode}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(getResponse);
      expect(getResponse.body.data.keyInfo.keyCode).toBe(keyCode);
      expect(getResponse.body.data.keyInfo.role).toBe('teacher');
      expect(getResponse.body.data.keyInfo.description).toBe('Integration test key');
      expect(getResponse.body.data.keyInfo.maxUses).toBe(3);

      // Validate the key using the auth endpoint
      const validateResponse = await request(app)
        .post('/api/auth/validate-key')
        .send({ registrationKey: keyCode });

      expectSuccessResponse(validateResponse);
      expect(validateResponse.body.data.role).toBe('teacher');
      expect(validateResponse.body.data.valid).toBe(true);
    });
  });
});