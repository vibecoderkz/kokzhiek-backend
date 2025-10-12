import { Router } from 'express';
import { AuditService, AuditAction } from '../services/auditService';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAuditAccess, requireAdminForAudit } from '../middleware/auditMiddleware';

const router = Router();

/**
 * GET /api/audit/logs
 * Получить список audit logs с фильтрацией
 * Доступ: admin, moderator
 */
router.get('/logs', requireAuth, requireAuditAccess, async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const filters = {
      userId: userId as string,
      action: action as AuditAction,
      entityType: entityType as string,
      entityId: entityId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    };

    const result = await AuditService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message,
    });
  }
});

/**
 * GET /api/audit/logs/:entityType/:entityId
 * Получить историю изменений конкретной сущности
 * Доступ: admin, moderator
 */
router.get('/logs/:entityType/:entityId', requireAuth, requireAuditAccess, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page, limit } = req.query;

    const result = await AuditService.getAuditLogs({
      entityType,
      entityId,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch entity audit logs',
      error: error.message,
    });
  }
});

/**
 * POST /api/audit/cleanup
 * Запустить очистку старых логов (>6 месяцев)
 * Доступ: только admin
 */
router.post('/cleanup', requireAuth, requireAdminForAudit, async (req, res) => {
  try {
    const deletedCount = await AuditService.cleanupOldLogs();

    res.json({
      success: true,
      message: `Successfully marked ${deletedCount} old logs for deletion`,
      data: { deletedCount },
    });
  } catch (error: any) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup audit logs',
      error: error.message,
    });
  }
});

/**
 * POST /api/audit/permanent-delete
 * Навсегда удалить помеченные логи (>7 месяцев после soft delete)
 * Доступ: только admin
 */
router.post('/permanent-delete', requireAuth, requireAdminForAudit, async (req, res) => {
  try {
    const deletedCount = await AuditService.permanentlyDeleteOldLogs();

    res.json({
      success: true,
      message: `Permanently deleted ${deletedCount} audit logs`,
      data: { deletedCount },
    });
  } catch (error: any) {
    console.error('Error permanently deleting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete audit logs',
      error: error.message,
    });
  }
});

/**
 * GET /api/audit/stats
 * Получить статистику по audit logs
 * Доступ: admin, moderator
 */
router.get('/stats', requireAuth, requireAuditAccess, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Получаем логи для расчета статистики
    const result = await AuditService.getAuditLogs({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: 10000, // Получаем больше логов для статистики
    });

    // Подсчитываем статистику
    const stats = {
      total: result.pagination.total,
      byAction: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
    };

    result.logs.forEach((log) => {
      // По действиям
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // По типам сущностей
      stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;

      // По пользователям
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit stats',
      error: error.message,
    });
  }
});

export default router;
