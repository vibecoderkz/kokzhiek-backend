import cron from 'node-cron';
import { AuditService } from '../services/auditService';

/**
 * Настройка автоматической очистки старых audit logs
 *
 * Расписание:
 * - Мягкое удаление (soft delete) логов старше 6 месяцев - каждый день в 3:00
 * - Жёсткое удаление (permanent delete) помеченных логов - каждый день в 4:00
 */
export function setupAuditLogCleanup() {
  // Мягкое удаление логов старше 6 месяцев (каждый день в 3:00 ночи)
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[Cron] Starting audit logs cleanup (soft delete)...');
      const deletedCount = await AuditService.cleanupOldLogs();
      console.log(`[Cron] Successfully soft-deleted ${deletedCount} old audit logs`);
    } catch (error) {
      console.error('[Cron] Error during audit logs cleanup:', error);
    }
  });

  // Жёсткое удаление помеченных логов старше 7 месяцев (каждый день в 4:00 ночи)
  cron.schedule('0 4 * * *', async () => {
    try {
      console.log('[Cron] Starting audit logs permanent deletion...');
      const deletedCount = await AuditService.permanentlyDeleteOldLogs();
      console.log(`[Cron] Successfully permanently deleted ${deletedCount} audit logs`);
    } catch (error) {
      console.error('[Cron] Error during permanent deletion of audit logs:', error);
    }
  });

  console.log('[Cron] Audit log cleanup jobs scheduled');
  console.log('  - Soft delete (6 months old): Daily at 3:00 AM');
  console.log('  - Permanent delete (7 months after soft delete): Daily at 4:00 AM');
}
