import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { RegistrationKeyService } from '../services/registrationKeyService';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ValidateKeyInput
} from '../types/auth';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: RegisterInput = req.body;
      const result = await this.authService.register(input);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: LoginInput = req.body;
      const result = await this.authService.login(input);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: ForgotPasswordInput = req.body;
      const result = await this.authService.forgotPassword(input);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: ResetPasswordInput = req.body;
      const result = await this.authService.resetPassword(input);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      const result = await this.authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  validateKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: ValidateKeyInput = req.body;
      const validation = await RegistrationKeyService.validateRegistrationKey(input.registrationKey);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REGISTRATION_KEY',
            message: validation.error
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Registration key is valid',
        data: {
          keyInfo: {
            description: validation.keyInfo!.description,
            usesRemaining: validation.keyInfo!.usesRemaining,
            expiresAt: validation.keyInfo!.expiresAt,
            role: validation.keyInfo!.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getUserProfile(req.user!.userId);

      res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updates = req.body;
      const user = await this.authService.updateUserProfile(req.user!.userId, updates);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(req.user!.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };
}