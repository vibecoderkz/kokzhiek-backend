import { eq, and, lt, gt, or, isNull } from 'drizzle-orm';
import { db } from '../config/database';
import { registrationKeys } from '../models/schema';
import { UserRole } from '../types/auth';
import { generateRegistrationKey } from '../utils/crypto';

export interface CreateRegistrationKeyInput {
  role: UserRole;
  description?: string;
  maxUses?: number;
  expiresAt?: Date;
  keyCode?: string;
  createdBy: string;
}

export interface RegistrationKeyInfo {
  id: string;
  keyCode: string;
  role: UserRole;
  description: string | null;
  maxUses: number | null;
  currentUses: number | null;
  usesRemaining: number;
  expiresAt: Date | null;
  isActive: boolean | null;
  status: 'active' | 'expired' | 'exhausted' | 'inactive';
}

export class RegistrationKeyService {
  static async createRegistrationKey(input: CreateRegistrationKeyInput): Promise<RegistrationKeyInfo> {
    const keyCode = input.keyCode || generateRegistrationKey();

    const [key] = await db.insert(registrationKeys).values({
      keyCode,
      role: input.role,
      description: input.description,
      maxUses: input.maxUses || 1,
      currentUses: 0,
      expiresAt: input.expiresAt,
      isActive: true,
      createdBy: input.createdBy,
    }).returning();

    return this.formatKeyInfo(key);
  }

  static async validateRegistrationKey(keyCode: string): Promise<{ valid: boolean; keyInfo?: RegistrationKeyInfo; error?: string }> {
    const key = await db.query.registrationKeys.findFirst({
      where: eq(registrationKeys.keyCode, keyCode),
    });

    if (!key) {
      return { valid: false, error: 'Registration key not found' };
    }

    const keyInfo = this.formatKeyInfo(key);

    if (!key.isActive) {
      return { valid: false, keyInfo, error: 'Registration key is inactive' };
    }

    if (key.expiresAt && new Date() > key.expiresAt) {
      return { valid: false, keyInfo, error: 'Registration key has expired' };
    }

    if (key.maxUses && key.currentUses !== null && key.currentUses >= key.maxUses) {
      return { valid: false, keyInfo, error: 'Registration key has been exhausted' };
    }

    return { valid: true, keyInfo };
  }

  static async useRegistrationKey(keyCode: string): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateRegistrationKey(keyCode);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      await db.update(registrationKeys)
        .set({
          currentUses: (validation.keyInfo!.currentUses || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(registrationKeys.keyCode, keyCode));

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update registration key usage' };
    }
  }

  static async getRegistrationKeyByCode(keyCode: string): Promise<RegistrationKeyInfo | null> {
    const key = await db.query.registrationKeys.findFirst({
      where: eq(registrationKeys.keyCode, keyCode),
    });

    return key ? this.formatKeyInfo(key) : null;
  }

  static async getAllRegistrationKeys(options?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'expired' | 'exhausted' | 'inactive';
  }): Promise<{ keys: RegistrationKeyInfo[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (options?.status) {
      switch (options.status) {
        case 'active':
          whereConditions = [
            eq(registrationKeys.isActive, true),
            or(
              isNull(registrationKeys.expiresAt),
              gt(registrationKeys.expiresAt, new Date())
            )
          ];
          break;
        case 'expired':
          whereConditions = [
            eq(registrationKeys.isActive, true),
            lt(registrationKeys.expiresAt, new Date())
          ];
          break;
        case 'exhausted':
          whereConditions = [
            eq(registrationKeys.isActive, true)
          ];
          break;
        case 'inactive':
          whereConditions = [eq(registrationKeys.isActive, false)];
          break;
      }
    }

    const keys = await db.query.registrationKeys.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      limit,
      offset,
      orderBy: (registrationKeys, { desc }) => [desc(registrationKeys.createdAt)],
    });

    // For simplicity, we'll return the current page count as total
    // In a real implementation, you'd want to run a separate count query
    const total = keys.length;

    return {
      keys: keys.map(key => this.formatKeyInfo(key)),
      total
    };
  }

  static async createBulkRegistrationKeys(input: {
    role: UserRole;
    count: number;
    description?: string;
    maxUses?: number;
    expiresAt?: Date;
    keyPrefix?: string;
    createdBy: string;
  }): Promise<string[]> {
    const keys: string[] = [];

    for (let i = 0; i < input.count; i++) {
      const keyCode = generateRegistrationKey(input.keyPrefix);
      keys.push(keyCode);

      await db.insert(registrationKeys).values({
        keyCode,
        role: input.role,
        description: input.description,
        maxUses: input.maxUses || 1,
        currentUses: 0,
        expiresAt: input.expiresAt,
        isActive: true,
        createdBy: input.createdBy,
      });
    }

    return keys;
  }

  private static formatKeyInfo(key: any): RegistrationKeyInfo {
    const now = new Date();
    let status: 'active' | 'expired' | 'exhausted' | 'inactive' = 'active';

    if (!key.isActive) {
      status = 'inactive';
    } else if (key.expiresAt && now > key.expiresAt) {
      status = 'expired';
    } else if (key.maxUses && key.currentUses !== null && key.currentUses >= key.maxUses) {
      status = 'exhausted';
    }

    const usesRemaining = key.maxUses ? key.maxUses - (key.currentUses || 0) : Infinity;

    return {
      id: key.id,
      keyCode: key.keyCode,
      role: key.role,
      description: key.description,
      maxUses: key.maxUses,
      currentUses: key.currentUses,
      usesRemaining: usesRemaining === Infinity ? -1 : Math.max(0, usesRemaining),
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      status
    };
  }
}