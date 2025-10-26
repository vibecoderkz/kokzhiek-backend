import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users, schools } from '../models/schema';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UserRole
} from '../types/auth';
import {
  hashPassword,
  comparePassword,
  generateJWT,
  generateRandomToken
} from '../utils/crypto';
import { RegistrationKeyService } from './registrationKeyService';
import { EmailService } from './emailService';
import { createError } from '../middleware/errorHandler';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  emailVerified: boolean | null;
  createdAt: Date | null;
}

export class AuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async register(input: RegisterInput): Promise<{ user: AuthUser; message: string }> {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw createError(409, 'CONFLICT', 'User with this email already exists');
    }

    const keyValidation = await RegistrationKeyService.validateRegistrationKey(input.registrationKey);
    if (!keyValidation.valid) {
      throw createError(400, 'INVALID_REGISTRATION_KEY', keyValidation.error!);
    }

    const keyInfo = keyValidation.keyInfo!;
    const hashedPassword = await hashPassword(input.password);
    const verificationToken = generateRandomToken();

    let schoolId = input.schoolId;

    if (keyInfo.role === 'school' && input.schoolName) {
      const [school] = await db.insert(schools).values({
        name: input.schoolName,
        isActive: true,
      }).returning();
      schoolId = school.id;
    }

    const [user] = await db.insert(users).values({
      email: input.email,
      passwordHash: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      role: keyInfo.role,
      registrationKeyId: keyInfo.id,
      schoolId,
      emailVerificationToken: verificationToken,
      emailVerified: false,
    }).returning();

    if (keyInfo.role === 'school' && schoolId) {
      await db.update(schools)
        .set({ adminId: user.id })
        .where(eq(schools.id, schoolId));
    }

    await RegistrationKeyService.useRegistrationKey(input.registrationKey);

    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName!, verificationToken);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    return {
      user: this.formatUser(user),
      message: 'Registration successful. Please check your email to verify your account.'
    };
  }

  async login(input: LoginInput): Promise<{ token: string; user: AuthUser }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      throw createError(401, 'AUTHENTICATION_ERROR', 'Invalid email or password');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw createError(401, 'AUTHENTICATION_ERROR', 'Invalid email or password');
    }

    const token = generateJWT({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId || undefined,
      teacherId: user.teacherId || undefined,
    });

    return {
      token,
      user: this.formatUser(user)
    };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      return { message: 'Password reset email sent if account exists' };
    }

    const resetToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    try {
      await this.emailService.sendPasswordResetEmail(user.email, user.firstName!, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return { message: 'Password reset email sent if account exists' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.passwordResetToken, input.token),
    });

    if (!user) {
      throw createError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
    }

    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      throw createError(400, 'EXPIRED_TOKEN', 'Reset token has expired');
    }

    const hashedPassword = await hashPassword(input.newPassword);

    await db.update(users)
      .set({
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return { message: 'Password reset successful' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!user) {
      throw createError(400, 'INVALID_TOKEN', 'Invalid verification token');
    }

    await db.update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return { message: 'Email verified successfully' };
  }

  async getUserProfile(userId: string): Promise<AuthUser> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    return this.formatUser(user);
  }

  async updateUserProfile(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<AuthUser> {
    // Если обновляется email, проверяем что он уникален
    if (updates.email) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, updates.email),
      });

      if (existingUser && existingUser.id !== userId) {
        throw createError(409, 'CONFLICT', 'User with this email already exists');
      }
    }

    const [user] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    return this.formatUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw createError(404, 'NOT_FOUND', 'User not found');
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw createError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await db.update(users)
      .set({
        passwordHash: hashedNewPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return { message: 'Password changed successfully' };
  }

  private formatUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    };
  }
}