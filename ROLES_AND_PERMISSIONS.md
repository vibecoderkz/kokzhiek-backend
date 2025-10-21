# Роли и Права Доступа

## Обзор системы ролей

Система Kokzhiek использует иерархическую систему ролей для контроля доступа к различным функциям платформы.

## Список ролей

### 1. **Admin** (Администратор)
Полный доступ ко всем функциям системы.

**Возможности:**
- ✅ Создание и управление регистрационными ключами
- ✅ Управление пользователями всех ролей
- ✅ Просмотр и управление всеми школами
- ✅ Доступ к статистике и аналитике
- ✅ Экспорт системных данных
- ✅ **Просмотр и экспорт audit логов**
- ✅ **Поиск по audit логам**
- ✅ Управление всеми книгами и контентом

### 2. **Moderator** (Модератор)
Помощник администратора с ограниченными правами.

**Возможности:**
- ✅ **Просмотр и экспорт audit логов**
- ✅ **Поиск по audit логам**
- ✅ Просмотр книг и контента
- ❌ Не может создавать регистрационные ключи
- ❌ Не может удалять пользователей
- ❌ Ограниченный доступ к системным настройкам

### 3. **Author** (Автор)
Создатель образовательного контента.

**Возможности:**
- ✅ Создание и редактирование книг
- ✅ Управление главами и блоками
- ✅ Публикация контента
- ❌ Не может просматривать audit логи
- ❌ Нет доступа к административным функциям

### 4. **School** (Школа)
Администратор школы.

**Возможности:**
- ✅ Управление учителями и учениками своей школы
- ✅ Просмотр статистики школы
- ✅ Назначение учителей ученикам
- ❌ Нет доступа к другим школам
- ❌ Не может просматривать audit логи

### 5. **Teacher** (Учитель)
Преподаватель в школе.

**Возможности:**
- ✅ Просмотр назначенных учеников
- ✅ Доступ к учебным материалам
- ✅ Создание заданий
- ❌ Не может управлять другими учителями
- ❌ Нет административных прав

### 6. **Student** (Ученик)
Обучающийся.

**Возможности:**
- ✅ Доступ к учебным материалам
- ✅ Выполнение заданий
- ✅ Просмотр своего прогресса
- ❌ Минимальные права доступа
- ❌ Нет доступа к административным функциям

---

## Права доступа к Audit Logs

### Кто может просматривать историю изменений?

| Функция | Admin | Moderator | Author | School | Teacher | Student |
|---------|-------|-----------|--------|--------|---------|---------|
| Экспорт audit логов (`/api/admin/audit-logs/export`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Поиск по audit логам (`/api/admin/audit-logs/search`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Просмотр личных данных в логах | ❌ (скрыты) | ❌ (скрыты) | ❌ | ❌ | ❌ | ❌ |

### Защита данных в audit логах

Система автоматически скрывает конфиденциальные поля:
- `passwordHash` → `[REDACTED]`
- `password` → `[REDACTED]`
- `emailVerificationToken` → `[REDACTED]`
- `passwordResetToken` → `[REDACTED]`
- `tokenHash` → `[REDACTED]`
- `token` → `[REDACTED]`

Эта защита применяется через функцию `sanitizeLog` в `src/services/auditService.ts`.

---

## Проверка прав доступа на сервере

### Middleware для авторизации

Система использует два основных middleware для проверки прав:

#### 1. `authenticateToken`
Проверяет наличие и валидность JWT токена.

```typescript
import { authenticateToken } from '../middleware/auth';

router.get('/protected-route',
  authenticateToken,  // Проверка токена
  async (req, res) => {
    // req.user содержит информацию о пользователе
  }
);
```

#### 2. `requireRole`
Проверяет роль пользователя.

```typescript
import { requireRole } from '../middleware/roleAuth';

// Доступ только для админов
router.get('/admin-only',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => { /* ... */ }
);

// Доступ для админов и модераторов
router.get('/admin-or-moderator',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  async (req, res) => { /* ... */ }
);
```

### Готовые функции проверки ролей

Файл `src/middleware/auth.ts` предоставляет готовые функции:

```typescript
// Только админы
export const requireAdmin = requireRole(['admin']);

// Админы или модераторы
export const requireAdminOrModerator = requireRole(['admin', 'moderator']);

// Админы, модераторы или авторы
export const requireAuthor = requireRole(['admin', 'moderator', 'author']);

// Админы, модераторы или школы
export const requireSchool = requireRole(['admin', 'moderator', 'school']);

// Админы, модераторы, школы или учителя
export const requireTeacher = requireRole(['admin', 'moderator', 'school', 'teacher']);

// Все авторизованные пользователи
export const requireStudent = requireRole(['admin', 'moderator', 'school', 'teacher', 'student']);
```

### Пример использования в роутах

```typescript
import { Router } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrModerator } from '../middleware/auth';

const router = Router();

// Только админы могут создавать ключи регистрации
router.post('/registration-keys',
  authenticateToken,
  requireAdmin,
  async (req, res) => { /* ... */ }
);

// Админы и модераторы могут экспортировать audit логи
router.get('/audit-logs/export',
  authenticateToken,
  requireAdminOrModerator,
  async (req, res) => { /* ... */ }
);

export default router;
```

---

## Ответы на ошибки авторизации

### 401 Unauthorized
Токен отсутствует или недействителен.

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
У пользователя нет необходимой роли.

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Insufficient permissions"
  }
}
```

Или с указанием требуемых ролей:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Required roles: admin, moderator"
  }
}
```

---

## Проверка ролей на Frontend

### Получение роли пользователя

При успешной авторизации backend возвращает JWT токен, который содержит информацию о роли:

```typescript
// Декодирование токена (без проверки, только для чтения)
const token = localStorage.getItem('admin_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('User role:', payload.role);
  // payload.role может быть: 'admin', 'moderator', 'author', и т.д.
}
```

### Условный рендеринг на основе роли

```typescript
// Пример для React
const isAdminOrModerator = ['admin', 'moderator'].includes(userRole);

return (
  <div>
    {isAdminOrModerator && (
      <button onClick={handleExportLogs}>
        Экспортировать логи
      </button>
    )}
  </div>
);
```

**⚠️ Важно:** Проверка на frontend служит только для UX. **Основная защита всегда на сервере!**

---

## Тестирование прав доступа

### Тест 1: Доступ админа к audit логам

```bash
# Получить токен админа
ADMIN_TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.data.token')

# Экспорт логов
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ожидаемый результат: 200 OK, CSV файл
```

### Тест 2: Доступ модератора к audit логам

```bash
# Получить токен модератора
MODERATOR_TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"moderator@example.com","password":"mod123"}' \
  | jq -r '.data.token')

# Поиск по логам
curl -X GET "http://localhost:3000/api/admin/audit-logs/search?query=книга" \
  -H "Authorization: Bearer $MODERATOR_TOKEN"

# Ожидаемый результат: 200 OK, JSON с результатами
```

### Тест 3: Запрет доступа для других ролей

```bash
# Получить токен учителя
TEACHER_TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@example.com","password":"teach123"}' \
  | jq -r '.data.token')

# Попытка экспорта логов
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# Ожидаемый результат: 403 Forbidden
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "Access denied. Required roles: admin, moderator"
#   }
# }
```

### Тест 4: Запрос без токена

```bash
# Попытка доступа без авторизации
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv"

# Ожидаемый результат: 401 Unauthorized
# {
#   "success": false,
#   "error": {
#     "code": "AUTHENTICATION_ERROR",
#     "message": "Access token is required"
#   }
# }
```

---

## Безопасность

### Принципы безопасности

1. **Проверка на сервере** - Все проверки прав доступа выполняются на backend
2. **JWT токены** - Используются для безопасной аутентификации
3. **Middleware цепочки** - Каждый защищенный роут проходит через `authenticateToken` → `requireRole`
4. **Автоматическая санитизация** - Личные данные скрываются автоматически при экспорте
5. **Минимальные привилегии** - Каждая роль имеет только необходимые права

### Что делать при подозрении на нарушение безопасности

1. Проверьте логи доступа в audit logs
2. Используйте endpoint `/api/admin/audit-logs/search` для поиска подозрительной активности
3. При необходимости измените права доступа в `src/routes/admin.ts`
4. Обновите роли пользователей через админ-панель

---

## Резюме

| Задача | Решение |
|--------|---------|
| **Кто может просматривать audit логи?** | Admin и Moderator |
| **Как проверяются права?** | `authenticateToken` + `requireRole(['admin', 'moderator'])` |
| **Где настраивать права?** | `src/routes/admin.ts` - изменить массив ролей в `requireRole([...])` |
| **Защищены ли личные данные?** | Да, автоматически через `sanitizeLog()` |
| **Как тестировать?** | curl с разными токенами (см. раздел "Тестирование") |

## Файлы для изучения

- `src/middleware/auth.ts` - Middleware авторизации
- `src/middleware/roleAuth.ts` - Проверка ролей
- `src/types/auth.ts` - Определения типов ролей
- `src/routes/admin.ts` - Admin роуты с проверкой прав
- `src/services/auditService.ts` - Санитизация логов
