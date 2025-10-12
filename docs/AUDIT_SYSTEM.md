# Система аудита (Audit Logging System)

## Описание

Система аудита предназначена для отслеживания всех важных действий пользователей в системе. Она записывает детальную информацию об изменениях данных, включая старые и новые значения, что позволяет:

- Отслеживать историю изменений любой сущности
- Выявлять несанкционированные действия
- Проводить анализ активности пользователей
- Соблюдать требования безопасности и compliance

## Структура базы данных

### Таблица `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action audit_action NOT NULL,          -- 'create', 'update', 'delete', 'login', 'logout', 'access'
  entity_type VARCHAR(50) NOT NULL,      -- 'book', 'chapter', 'block', 'user', etc.
  entity_id UUID,
  description TEXT,
  extra_data JSONB,                      -- { oldValue: {...}, newValue: {...}, changes: [...] }
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE    -- для мягкого удаления старых логов
);
```

### Поле `extra_data` (JSON)

Содержит детальную информацию об изменениях:

```json
{
  "oldValue": {
    "title": "Старое название",
    "description": "Старое описание"
  },
  "newValue": {
    "title": "Новое название",
    "description": "Новое описание"
  },
  "changes": [
    {
      "field": "title",
      "oldValue": "Старое название",
      "newValue": "Новое название"
    }
  ]
}
```

## API Endpoints

### 1. Получить список логов с фильтрацией

**GET** `/api/audit/logs`

**Права доступа:** admin, moderator

**Query параметры:**
- `userId` - фильтр по пользователю
- `action` - фильтр по типу действия (create/update/delete/login/logout/access)
- `entityType` - фильтр по типу сущности (book/chapter/block/user)
- `entityId` - фильтр по ID сущности
- `startDate` - начало периода (ISO 8601)
- `endDate` - конец периода (ISO 8601)
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество записей на странице (по умолчанию 50, максимум 100)

**Пример запроса:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/audit/logs?entityType=book&action=update&page=1&limit=20"
```

**Пример ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "action": "update",
      "entityType": "book",
      "entityId": "book-uuid",
      "description": "Updated book book-uuid: 2 field(s) changed",
      "extraData": {
        "oldValue": { "title": "Old Title" },
        "newValue": { "title": "New Title" },
        "changes": [
          {
            "field": "title",
            "oldValue": "Old Title",
            "newValue": "New Title"
          }
        ]
      },
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-10-12T20:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### 2. Получить историю изменений сущности

**GET** `/api/audit/logs/:entityType/:entityId`

**Права доступа:** admin, moderator

**Пример запроса:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/audit/logs/book/abc-123-def?page=1&limit=10"
```

### 3. Очистка старых логов (>6 месяцев)

**POST** `/api/audit/cleanup`

**Права доступа:** только admin

**Описание:** Помечает логи старше 6 месяцев как удаленные (мягкое удаление)

**Пример запроса:**
```bash
curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:3000/api/audit/cleanup"
```

**Пример ответа:**
```json
{
  "success": true,
  "message": "Successfully marked 1523 old logs for deletion",
  "data": {
    "deletedCount": 1523
  }
}
```

### 4. Полное удаление помеченных логов (>7 месяцев)

**POST** `/api/audit/permanent-delete`

**Права доступа:** только admin

**Описание:** Навсегда удаляет логи, помеченные как deleted_at более 7 месяцев назад

**Пример запроса:**
```bash
curl -X POST -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:3000/api/audit/permanent-delete"
```

### 5. Получить статистику по логам

**GET** `/api/audit/stats`

**Права доступа:** admin, moderator

**Query параметры:**
- `startDate` - начало периода
- `endDate` - конец периода

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "total": 5432,
    "byAction": {
      "create": 1200,
      "update": 3100,
      "delete": 150,
      "login": 820,
      "logout": 162
    },
    "byEntityType": {
      "book": 2800,
      "chapter": 1500,
      "block": 900,
      "user": 232
    },
    "byUser": {
      "user-uuid-1": 3200,
      "user-uuid-2": 1800,
      "user-uuid-3": 432
    }
  }
}
```

## Использование в коде

### 1. Логирование создания сущности

```typescript
import { AuditService } from '../services/auditService';

// При создании книги
const newBook = await BookService.createBook(bookData);

await AuditService.logCreate(
  userId,
  'book',
  newBook.id,
  newBook,
  req
);
```

### 2. Логирование обновления с детализацией изменений

```typescript
import { AuditService } from '../services/auditService';

// При обновлении книги
const oldBook = await BookService.getBookById(bookId);
const updatedBook = await BookService.updateBook(bookId, updateData);

await AuditService.logUpdate(
  userId,
  'book',
  bookId,
  oldBook,      // старое значение
  updatedBook,  // новое значение
  req
);
```

### 3. Логирование удаления

```typescript
import { AuditService } from '../services/auditService';

// При удалении книги
const book = await BookService.getBookById(bookId);
await BookService.deleteBook(bookId);

await AuditService.logDelete(
  userId,
  'book',
  bookId,
  book,  // сохраняем данные удаленной сущности
  req
);
```

### 4. Логирование входа/выхода

```typescript
import { AuditService } from '../services/auditService';

// При успешном логине
await AuditService.logLogin(userId, true, req);

// При неудачной попытке логина
await AuditService.logLogin(userId, false, req);

// При выходе
await AuditService.logLogout(userId, req);
```

### 5. Логирование доступа к ресурсу

```typescript
import { AuditService } from '../services/auditService';

// При просмотре книги
await AuditService.logAccess(userId, 'book', bookId, req);
```

## Права доступа

### Роли с доступом к audit logs:

1. **admin** - полный доступ:
   - Просмотр всех логов
   - Фильтрация и поиск
   - Запуск очистки логов
   - Полное удаление логов
   - Просмотр статистики

2. **moderator** - ограниченный доступ:
   - Просмотр всех логов
   - Фильтрация и поиск
   - Просмотр статистики
   - ❌ Не может удалять логи

3. **Остальные роли** (author, school, teacher, student):
   - ❌ Нет доступа к audit logs

## Автоматическая очистка

### Стратегия хранения логов:

1. **Активные логи** (0-6 месяцев):
   - Хранятся в полном объеме
   - Доступны для просмотра

2. **Старые логи** (6-7 месяцев):
   - Помечаются как deleted_at (мягкое удаление)
   - Не отображаются в интерфейсе
   - Можно восстановить при необходимости

3. **Очень старые логи** (>7 месяцев после soft delete):
   - Удаляются навсегда
   - Освобождается место в БД

### Настройка автоматической очистки:

Рекомендуется настроить cron job для регулярной очистки:

```bash
# Пример cron job (запуск каждую неделю в воскресенье в 3:00)
0 3 * * 0 curl -X POST http://localhost:3000/api/audit/cleanup
```

Или использовать node-cron в приложении:

```typescript
import cron from 'node-cron';
import { AuditService } from './services/auditService';

// Запуск очистки каждую неделю
cron.schedule('0 3 * * 0', async () => {
  console.log('Running audit logs cleanup...');
  await AuditService.cleanupOldLogs();
  console.log('Cleanup completed');
});

// Запуск полного удаления каждый месяц
cron.schedule('0 4 1 * *', async () => {
  console.log('Running permanent deletion of old audit logs...');
  await AuditService.permanentlyDeleteOldLogs();
  console.log('Permanent deletion completed');
});
```

## Безопасность

### Защита от несанкционированного доступа:

1. **Middleware проверки прав:**
   - `requireAuditAccess` - проверяет что пользователь admin или moderator
   - `requireAdminForAudit` - проверяет что пользователь admin

2. **Rate limiting:**
   - Используется глобальный rate limiter (настроен в app.ts)
   - Защита от DDoS и brute-force атак

3. **Валидация входных данных:**
   - Все параметры проверяются на корректность
   - Защита от SQL injection через Drizzle ORM

## Производительность

### Индексы для ускорения запросов:

```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_deleted_at ON audit_logs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
```

### Рекомендации:

- Используйте пагинацию (limit не более 100 записей)
- Применяйте фильтры для уменьшения объема данных
- Регулярно запускайте очистку старых логов
- Настройте мониторинг размера таблицы audit_logs

## Примеры использования

### Пример 1: Отслеживание изменений книги

```typescript
// В bookRoutes.ts
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  // Получаем старое значение
  const oldBook = await BookService.getBookById(id, userId);

  // Обновляем книгу
  const updatedBook = await BookService.updateBook(id, userId, req.body);

  // Логируем изменение
  await AuditService.logUpdate(userId, 'book', id, oldBook, updatedBook, req);

  res.json({ success: true, data: updatedBook });
});
```

### Пример 2: Просмотр истории книги в админке

```typescript
// В админ-панели
async function showBookHistory(bookId: string) {
  const response = await fetch(
    `/api/audit/logs/book/${bookId}?page=1&limit=50`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { data } = await response.json();

  // Отображаем историю изменений
  data.forEach(log => {
    console.log(`${log.createdAt}: ${log.action} by ${log.userId}`);
    if (log.extraData?.changes) {
      log.extraData.changes.forEach(change => {
        console.log(`  ${change.field}: ${change.oldValue} → ${change.newValue}`);
      });
    }
  });
}
```

## Миграция

Для применения миграции выполните:

```bash
# Подключитесь к базе данных
psql $DATABASE_URL

# Примените миграцию
\i src/migrations/004_create_audit_logs.sql
```

Или используйте скрипт миграции через Node.js.

## Troubleshooting

### Проблема: "Access denied"

**Причина:** Пользователь не имеет прав admin или moderator

**Решение:** Убедитесь что роль пользователя установлена правильно:
```sql
SELECT id, email, role FROM users WHERE id = 'user-uuid';
UPDATE users SET role = 'admin' WHERE id = 'user-uuid';
```

### Проблема: Большой размер таблицы audit_logs

**Причина:** Не настроена автоматическая очистка

**Решение:**
1. Запустите ручную очистку: `POST /api/audit/cleanup`
2. Настройте cron job для регулярной очистки
3. Проверьте что настроены индексы

### Проблема: Медленные запросы

**Причина:** Отсутствуют индексы или слишком большой limit

**Решение:**
1. Проверьте что все индексы созданы
2. Используйте limit не более 100
3. Применяйте фильтры для уменьшения объема данных
