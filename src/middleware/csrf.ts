import { Request, Response, NextFunction } from 'express';

const PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!PROTECTED_METHODS.has(req.method)) {
    return next();
  }

  const tokenFromHeader = req.header('X-CSRF-Token');
  const tokenFromCookie = req.cookies['csrf_token'];

  if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'Invalid CSRF token.'
      }
    });
  }

  next();
}
