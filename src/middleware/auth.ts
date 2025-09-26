import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/crypto';
import { UserRole } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    schoolId?: string;
    teacherId?: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Access token is required'
      }
    });
  }

  try {
    const decoded = verifyJWT(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      schoolId: decoded.schoolId,
      teacherId: decoded.teacherId
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token'
      }
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'User not authenticated'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireAdminOrModerator = requireRole(['admin', 'moderator']);
export const requireAuthor = requireRole(['admin', 'moderator', 'author']);
export const requireSchool = requireRole(['admin', 'moderator', 'school']);
export const requireTeacher = requireRole(['admin', 'moderator', 'school', 'teacher']);
export const requireStudent = requireRole(['admin', 'moderator', 'school', 'teacher', 'student']);