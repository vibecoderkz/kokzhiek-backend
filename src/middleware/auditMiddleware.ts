import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth';

/**
 * Middleware для проверки прав доступа к audit logs
 * Только admin и moderator могут просматривать аудит-логи
 */
export const requireAuditAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Проверяем роль пользователя
  const allowedRoles: UserRole[] = ['admin', 'moderator'];

  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Audit logs are only available to administrators and moderators.',
    });
  }

  next();
};

/**
 * Middleware для проверки, является ли пользователь администратором
 * Только admin может удалять логи и изменять настройки аудита
 */
export const requireAdminForAudit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This action requires administrator privileges.',
    });
  }

  next();
};
