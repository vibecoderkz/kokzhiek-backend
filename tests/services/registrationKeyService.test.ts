import { RegistrationKeyService } from '../../src/services/registrationKeyService';
import { createMockRegistrationKey } from '../helpers/testUtils';
import * as crypto from '../../src/utils/crypto';

jest.mock('../../src/config/database', () => ({
  db: {
    query: {
      registrationKeys: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(),
      })),
    })),
  },
}));

const { db } = require('../../src/config/database');

describe('RegistrationKeyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRegistrationKey', () => {
    it('should create a registration key successfully', async () => {
      const mockKey = createMockRegistrationKey();
      const mockInsert = {
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([mockKey])
        }))
      };
      db.insert.mockReturnValue(mockInsert);

      jest.spyOn(crypto, 'generateRegistrationKey').mockReturnValue('REG-2024-ABC123');

      const input = {
        role: 'student' as const,
        description: 'Test key',
        maxUses: 1,
        createdBy: 'admin-id',
      };

      const result = await RegistrationKeyService.createRegistrationKey(input);

      expect(result).toBeDefined();
      expect(result.keyCode).toBe(mockKey.keyCode);
      expect(result.role).toBe(input.role);
      expect(result.status).toBe('active');
    });

    it('should create key with custom key code', async () => {
      const customKeyCode = 'CUSTOM-2024-XYZ789';
      const mockKey = createMockRegistrationKey({ keyCode: customKeyCode });
      const mockInsert = {
        values: jest.fn(() => ({
          returning: jest.fn().mockResolvedValue([mockKey])
        }))
      };
      db.insert.mockReturnValue(mockInsert);

      const input = {
        role: 'teacher' as const,
        keyCode: customKeyCode,
        createdBy: 'admin-id',
      };

      const result = await RegistrationKeyService.createRegistrationKey(input);

      expect(result.keyCode).toBe(customKeyCode);
    });
  });

  describe('validateRegistrationKey', () => {
    it('should validate active key successfully', async () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        maxUses: 5,
        currentUses: 2,
      });

      db.query.registrationKeys.findFirst.mockResolvedValue(mockKey);

      const result = await RegistrationKeyService.validateRegistrationKey('TEST-2024-ABC123');

      expect(result.valid).toBe(true);
      expect(result.keyInfo).toBeDefined();
      expect(result.keyInfo!.status).toBe('active');
      expect(result.keyInfo!.usesRemaining).toBe(3);
    });

    it('should return invalid for non-existent key', async () => {
      db.query.registrationKeys.findFirst.mockResolvedValue(null);

      const result = await RegistrationKeyService.validateRegistrationKey('NONEXISTENT-KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Registration key not found');
    });

    it('should return invalid for inactive key', async () => {
      const mockKey = createMockRegistrationKey({ isActive: false });
      db.query.registrationKeys.findFirst.mockResolvedValue(mockKey);

      const result = await RegistrationKeyService.validateRegistrationKey('INACTIVE-KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Registration key is inactive');
      expect(result.keyInfo!.status).toBe('inactive');
    });

    it('should return invalid for expired key', async () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      });
      db.query.registrationKeys.findFirst.mockResolvedValue(mockKey);

      const result = await RegistrationKeyService.validateRegistrationKey('EXPIRED-KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Registration key has expired');
      expect(result.keyInfo!.status).toBe('expired');
    });

    it('should return invalid for exhausted key', async () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        maxUses: 5,
        currentUses: 5,
      });
      db.query.registrationKeys.findFirst.mockResolvedValue(mockKey);

      const result = await RegistrationKeyService.validateRegistrationKey('EXHAUSTED-KEY');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Registration key has been exhausted');
      expect(result.keyInfo!.status).toBe('exhausted');
      expect(result.keyInfo!.usesRemaining).toBe(0);
    });
  });

  describe('useRegistrationKey', () => {
    it('should use registration key successfully', async () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        maxUses: 5,
        currentUses: 2,
      });

      db.query.registrationKeys.findFirst.mockResolvedValue(mockKey);
      const mockUpdate = {
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([])
        }))
      };
      db.update.mockReturnValue(mockUpdate);

      const result = await RegistrationKeyService.useRegistrationKey('TEST-2024-ABC123');

      expect(result.success).toBe(true);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        currentUses: 3,
        updatedAt: expect.any(Date),
      });
    });

    it('should fail to use invalid key', async () => {
      db.query.registrationKeys.findFirst.mockResolvedValue(null);

      const result = await RegistrationKeyService.useRegistrationKey('INVALID-KEY');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration key not found');
    });
  });

  describe('createBulkRegistrationKeys', () => {
    it('should create multiple registration keys', async () => {
      const mockKeys = [
        createMockRegistrationKey({ keyCode: 'BULK-001' }),
        createMockRegistrationKey({ keyCode: 'BULK-002' }),
        createMockRegistrationKey({ keyCode: 'BULK-003' }),
      ];

      jest.spyOn(crypto, 'generateRegistrationKey')
        .mockReturnValueOnce('BULK-001')
        .mockReturnValueOnce('BULK-002')
        .mockReturnValueOnce('BULK-003');

      const mockInsert = {
        values: jest.fn().mockResolvedValue(undefined)
      };
      db.insert.mockReturnValue(mockInsert);

      const input = {
        role: 'student' as const,
        count: 3,
        description: 'Bulk test keys',
        maxUses: 1,
        keyPrefix: 'BULK',
        createdBy: 'admin-id',
      };

      const result = await RegistrationKeyService.createBulkRegistrationKeys(input);

      expect(result).toHaveLength(3);
      expect(result).toEqual(['BULK-001', 'BULK-002', 'BULK-003']);
      expect(mockInsert.values).toHaveBeenCalledTimes(3);
    });
  });

  describe('getAllRegistrationKeys', () => {
    it('should get all registration keys with pagination', async () => {
      const mockKeys = [
        createMockRegistrationKey({ keyCode: 'KEY-001' }),
        createMockRegistrationKey({ keyCode: 'KEY-002' }),
      ];

      db.query.registrationKeys.findMany.mockResolvedValue(mockKeys);

      const result = await RegistrationKeyService.getAllRegistrationKeys({
        page: 1,
        limit: 20,
      });

      expect(result.keys).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.keys[0].keyCode).toBe('KEY-001');
    });

    it('should filter by status', async () => {
      const activeKey = createMockRegistrationKey({
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxUses: 5,
        currentUses: 2,
      });

      db.query.registrationKeys.findMany.mockResolvedValue([activeKey]);

      const result = await RegistrationKeyService.getAllRegistrationKeys({
        status: 'active',
      });

      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].status).toBe('active');
    });
  });

  describe('formatKeyInfo', () => {
    it('should format key info correctly for active key', () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxUses: 10,
        currentUses: 3,
      });

      const formatted = (RegistrationKeyService as any).formatKeyInfo(mockKey);

      expect(formatted.status).toBe('active');
      expect(formatted.usesRemaining).toBe(7);
    });

    it('should format key info correctly for unlimited uses', () => {
      const mockKey = createMockRegistrationKey({
        isActive: true,
        maxUses: null,
        currentUses: 5,
      });

      const formatted = (RegistrationKeyService as any).formatKeyInfo(mockKey);

      expect(formatted.usesRemaining).toBe(-1); // Unlimited
    });
  });
});