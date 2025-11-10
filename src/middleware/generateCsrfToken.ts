import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function generateCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Генерируем случайный токен
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Устанавливаем токен в куку
  // httpOnly: true - кука недоступна для JavaScript на клиенте, что повышает безопасность
  // secure: true - кука будет отправляться только по HTTPS
  // sameSite: 'Lax' - защита от CSRF-атак, отправляется только при навигации верхнего уровня
  res.cookie('csrf_token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // В продакшене только по HTTPS
    sameSite: 'Lax',
    maxAge: 3600000 // 1 час
  });

  // Передаем токен в res.locals, чтобы его можно было использовать в шаблонах или для отладки
  res.locals.csrfToken = csrfToken;

  next();
}
