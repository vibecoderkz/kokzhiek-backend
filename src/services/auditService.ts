import { db } from '../config/database';
import { auditLogs } from '../models/schema';
import { eq, and, desc, isNull, lt, sql, ilike, or } from 'drizzle-orm';
import { Request } from 'express';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'access';

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description?: string;
  extraData?: {
    oldValue?: any;
    newValue?: any;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string; // Поиск по описанию
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Создать запись в audit log
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        description: input.description,
        extraData: input.extraData || {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Не бросаем ошибку, чтобы не блокировать основной функционал
    }
  }

  /**
   * Залогировать создание сущности
   */
  static async logCreate(
    userId: string,
    entityType: string,
    entityId: string,
    newValue: any,
    req?: Request
  ): Promise<void> {
    // Переводим entityType на русский
    const entityTypeRu = entityType === 'book' ? 'книга' : entityType;

    // Получаем название для книги
    const entityName = entityType === 'book' && newValue?.title
      ? `"${newValue.title}"`
      : entityId;

    await this.log({
      userId,
      action: 'create',
      entityType,
      entityId,
      description: `Создана ${entityTypeRu} ${entityName}`,
      extraData: { newValue },
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Залогировать обновление сущности с детальными изменениями
   */
  static async logUpdate(
    userId: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    newValue: any,
    req?: Request
  ): Promise<void> {
    // Вычисляем изменения
    const changes = this.calculateChanges(oldValue, newValue);

    // Переводим entityType на русский (именительный падеж)
    const entityTypeRu = entityType === 'book' ? 'книга' : entityType;

    // Получаем название для книги
    const entityName = entityType === 'book' && (newValue?.title || oldValue?.title)
      ? `"${newValue?.title || oldValue?.title}"`
      : entityId;

    // Формируем описание изменённых полей
    let description: string;
    if (changes.length === 0) {
      description = `Обновлена ${entityTypeRu} ${entityName}`;
    } else if (changes.length <= 3) {
      // Если полей мало, перечисляем их
      const fieldNames = changes.map(c => this.translateFieldName(c.field)).join(', ');
      description = `Обновлена ${entityTypeRu} ${entityName}: ${fieldNames}`;
    } else {
      // Если полей много, указываем количество
      const fieldsWord = changes.length < 5 ? 'поля' : 'полей';
      description = `Обновлена ${entityTypeRu} ${entityName}: ${changes.length} ${fieldsWord}`;
    }

    await this.log({
      userId,
      action: 'update',
      entityType,
      entityId,
      description,
      extraData: {
        oldValue,
        newValue,
        changes,
      },
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Залогировать удаление сущности
   */
  static async logDelete(
    userId: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    req?: Request
  ): Promise<void> {
    // Переводим entityType на русский
    const entityTypeRu = entityType === 'book' ? 'книга' : entityType;

    // Получаем название для книги
    const entityName = entityType === 'book' && oldValue?.title
      ? `"${oldValue.title}"`
      : entityId;

    await this.log({
      userId,
      action: 'delete',
      entityType,
      entityId,
      description: `Удалена ${entityTypeRu} ${entityName}`,
      extraData: { oldValue },
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Залогировать вход в систему
   */
  static async logLogin(
    userId: string,
    success: boolean,
    req?: Request
  ): Promise<void> {
    await this.log({
      userId,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      description: success ? 'Пользователь вошёл в систему' : 'Неудачная попытка входа',
      extraData: { success },
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Залогировать выход из системы
   */
  static async logLogout(userId: string, req?: Request): Promise<void> {
    await this.log({
      userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      description: 'Пользователь вышел из системы',
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Залогировать доступ к ресурсу
   */
  static async logAccess(
    userId: string,
    entityType: string,
    entityId: string,
    req?: Request
  ): Promise<void> {
    // Переводим entityType на русский
    const entityTypeRu = entityType === 'book' ? 'книге' : entityType;

    await this.log({
      userId,
      action: 'access',
      entityType,
      entityId,
      description: `Открыт доступ к ${entityTypeRu} ${entityId}`,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    });
  }

  /**
   * Получить логи с фильтрацией
   */
  static async getAuditLogs(filters: AuditLogFilters = {}) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(auditLogs.deletedAt)];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
    }
    // Поиск по описанию (case-insensitive)
    if (filters.search) {
      conditions.push(ilike(auditLogs.description, `%${filters.search}%`));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions));

    // Обогащаем логи данными о пользователях и книгах
    const { users, books } = await import('../models/schema');
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let userEmail = null;
        let entityName = null;

        if (log.userId) {
          const [user] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, log.userId))
            .limit(1);

          userEmail = user?.email || null;
        }

        // Добавляем название для книг
        if (log.entityType === 'book' && log.entityId) {
          const [book] = await db
            .select({ title: books.title })
            .from(books)
            .where(eq(books.id, log.entityId))
            .limit(1);

          entityName = book?.title || null;
        }

        return {
          ...log,
          userEmail,
          entityName,
        };
      })
    );

    // Скрываем личные данные из extraData
    const sanitizedLogs = enrichedLogs.map(log => this.sanitizeLog(log));

    return {
      logs: sanitizedLogs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Мягкое удаление старых логов (старше 6 месяцев)
   */
  static async cleanupOldLogs(): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await db
      .update(auditLogs)
      .set({ deletedAt: new Date() })
      .where(
        and(
          lt(auditLogs.createdAt, sixMonthsAgo),
          isNull(auditLogs.deletedAt)
        )
      );

    console.log(`Cleaned up ${result.rowCount || 0} old audit logs`);
    return result.rowCount || 0;
  }

  /**
   * Жесткое удаление помеченных логов (старше 7 месяцев после soft delete)
   */
  static async permanentlyDeleteOldLogs(): Promise<number> {
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const result = await db
      .delete(auditLogs)
      .where(
        and(
          sql`${auditLogs.deletedAt} IS NOT NULL`,
          lt(auditLogs.deletedAt, sevenMonthsAgo)
        )
      );

    console.log(`Permanently deleted ${result.rowCount || 0} audit logs`);
    return result.rowCount || 0;
  }

  /**
   * Вычислить изменения между старым и новым значением
   */
  private static calculateChanges(
    oldValue: any,
    newValue: any
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (!oldValue || !newValue) {
      return changes;
    }

    // Сравниваем только общие поля
    const allKeys = new Set([
      ...Object.keys(oldValue),
      ...Object.keys(newValue),
    ]);

    for (const key of allKeys) {
      // Пропускаем технические поля
      if (['updatedAt', 'createdAt', 'passwordHash'].includes(key)) {
        continue;
      }

      const oldVal = oldValue[key];
      const newVal = newValue[key];

      // Сравниваем значения
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    return changes;
  }

  /**
   * Перевести название поля на русский
   */
  private static translateFieldName(fieldName: string): string {
    const translations: Record<string, string> = {
      // Основные поля книги
      title: 'название',
      description: 'описание',
      author: 'автор',
      authors: 'авторы',
      grade: 'класс',
      coverImageUrl: 'обложка',
      isPublic: 'публичность',
      visibility: 'видимость',
      isbn: 'ISBN',
      year: 'год издания',
      publisher: 'издательство',
      edition: 'издание',
      subject: 'предмет',
      language: 'язык',
      // Другие возможные поля
      schoolId: 'школа',
      ownerId: 'владелец',
    };

    return translations[fieldName] || fieldName;
  }

  /**
   * Скрыть личные данные из лога
   */
  private static sanitizeLog(log: any): any {
    const sensitiveFields = [
      'passwordHash',
      'password',
      'emailVerificationToken',
      'passwordResetToken',
      'tokenHash',
      'token',
    ];

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.includes(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    return {
      ...log,
      extraData: log.extraData ? sanitizeObject(log.extraData) : log.extraData,
    };
  }

  /**
   * Экспортировать логи в CSV формат
   */
  static async exportToCSV(filters: AuditLogFilters = {}): Promise<string> {
    // Получаем все логи без пагинации
    const allLogs = await this.getAuditLogs({
      ...filters,
      limit: 10000, // Максимум для экспорта
      page: 1,
    });

    // CSV заголовки
    const headers = [
      'ID',
      'Date',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Description',
      'IP Address',
      'Changes Count',
    ];

    // Формируем CSV строки
    const rows = allLogs.logs.map(log => {
      const changesCount = log.extraData?.changes?.length || 0;
      return [
        log.id,
        new Date(log.createdAt).toISOString(),
        log.userId || 'System',
        log.action,
        log.entityType,
        log.entityId || '-',
        `"${(log.description || '').replace(/"/g, '""')}"`, // Экранируем кавычки
        log.ipAddress || '-',
        changesCount,
      ].join(',');
    });

    // Собираем CSV
    const csv = [headers.join(','), ...rows].join('\n');
    return csv;
  }
}
