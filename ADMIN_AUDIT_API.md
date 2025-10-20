# Admin Audit Logs API

## Обзор

Два новых эндпоинта для работы с audit логами:
1. **Экспорт логов** - выгрузка истории в файл (CSV или JSON)
2. **Поиск по логам** - поиск по ключевым словам в описаниях

## Безопасность

✅ **Защита личных данных:**
- Пароли и токены автоматически скрываются (`sanitizeLog` в `auditService.ts`)
- Поля `passwordHash`, `password`, `emailVerificationToken`, `passwordResetToken`, `tokenHash`, `token` заменяются на `[REDACTED]`
- Доступ только для администраторов (требуется токен и роль `admin`)

---

## 1. Экспорт Audit Логов

### Эндпоинт
```
GET /api/admin/audit-logs/export
```

### Описание
Экспортирует audit логи в CSV или JSON формате. Поддерживает фильтрацию по дате, типу действия и типу сущности.

### Авторизация
- **Требуется:** Bearer Token
- **Роль:** Admin

### Query Parameters

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `format` | string | Нет | `csv` | Формат экспорта: `csv` или `json` |
| `startDate` | datetime | Нет | - | Фильтр: логи с этой даты |
| `endDate` | datetime | Нет | - | Фильтр: логи до этой даты |
| `action` | string | Нет | - | Фильтр по типу действия: `create`, `update`, `delete`, `login`, `logout`, `access` |
| `entityType` | string | Нет | - | Фильтр по типу сущности (например: `book`, `user`) |

### Примеры запросов

#### 1. Экспорт всех логов в CSV
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 2. Экспорт логов за последний месяц в JSON
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=json&startDate=2025-01-01T00:00:00Z&endDate=2025-02-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 3. Экспорт только логов обновления книг
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv&action=update&entityType=book" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Ответы

#### CSV формат (200 OK)
```csv
ID,Date,User ID,Action,Entity Type,Entity ID,Description,IP Address,Changes Count
abc123,2025-01-15T10:30:00.000Z,user456,update,book,book789,"Изменено: название, класс",192.168.1.1,2
```

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=audit_logs_2025-01-21.csv
```

#### JSON формат (200 OK)
```json
{
  "success": true,
  "exportedAt": "2025-01-21T12:00:00.000Z",
  "filters": {
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-02-01T00:00:00.000Z",
    "action": "update",
    "entityType": "book"
  },
  "data": [
    {
      "id": "abc123",
      "action": "update",
      "description": "Изменено: название, класс",
      "entityType": "book",
      "entityId": "book789",
      "entityName": "Математика 5 класс",
      "userId": "user456",
      "userEmail": "admin@example.com",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "ipAddress": "192.168.1.1",
      "extraData": {
        "changes": [
          {
            "field": "title",
            "oldValue": "Математика",
            "newValue": "Математика 5 класс"
          }
        ]
      }
    }
  ],
  "total": 1
}
```

**Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename=audit_logs_2025-01-21.json
```

#### Ошибки

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**403 Forbidden**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

---

## 2. Поиск по Audit Логам

### Эндпоинт
```
GET /api/admin/audit-logs/search
```

### Описание
Поиск audit логов по ключевым словам в описаниях. Поддерживает фильтрацию и пагинацию.

### Авторизация
- **Требуется:** Bearer Token
- **Роль:** Admin

### Query Parameters

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|----------|
| `query` | string | **Да** | - | Поисковый запрос (ключевые слова) |
| `page` | number | Нет | `1` | Номер страницы |
| `limit` | number | Нет | `50` | Количество результатов на странице (макс 100) |
| `action` | string | Нет | - | Фильтр по типу действия |
| `entityType` | string | Нет | - | Фильтр по типу сущности |
| `startDate` | datetime | Нет | - | Фильтр: логи с этой даты |
| `endDate` | datetime | Нет | - | Фильтр: логи до этой даты |

### Примеры запросов

#### 1. Поиск всех изменений названия
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/search?query=название" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 2. Поиск изменений класса в книгах
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/search?query=класс&entityType=book&action=update" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 3. Поиск с пагинацией
```bash
curl -X GET "http://localhost:3000/api/admin/audit-logs/search?query=изменено&page=2&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Ответы

#### 200 OK
```json
{
  "success": true,
  "message": "Search results retrieved successfully",
  "data": {
    "logs": [
      {
        "id": "log123",
        "action": "update",
        "description": "Изменено: название, класс",
        "entityType": "book",
        "entityId": "book456",
        "entityName": "Математика 5 класс",
        "userId": "user789",
        "userEmail": "teacher@example.com",
        "createdAt": "2025-01-20T14:30:00.000Z",
        "ipAddress": "192.168.1.100"
      },
      {
        "id": "log124",
        "action": "update",
        "description": "Изменено название",
        "entityType": "book",
        "entityId": "book457",
        "entityName": "Физика 8 класс",
        "userId": "user789",
        "userEmail": "teacher@example.com",
        "createdAt": "2025-01-20T15:00:00.000Z",
        "ipAddress": "192.168.1.100"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "totalPages": 1
    },
    "query": "название",
    "filters": {
      "action": null,
      "entityType": null,
      "startDate": null,
      "endDate": null
    }
  }
}
```

#### Ошибки

**400 Bad Request**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Search query is required"
  }
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**403 Forbidden**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}
```

---

## Примеры использования

### JavaScript/TypeScript

```typescript
// Экспорт логов в CSV
async function exportAuditLogs() {
  const response = await fetch(
    'http://localhost:3000/api/admin/audit-logs/export?format=csv&action=update',
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  const csvData = await response.text();
  
  // Сохранить файл
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit_logs.csv';
  a.click();
}

// Поиск логов
async function searchAuditLogs(searchQuery: string) {
  const response = await fetch(
    `http://localhost:3000/api/admin/audit-logs/search?query=${encodeURIComponent(searchQuery)}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );
  
  const data = await response.json();
  console.log('Search results:', data.data.logs);
  console.log('Total found:', data.data.pagination.total);
}
```

### Python

```python
import requests

# Экспорт логов в JSON
def export_audit_logs():
    url = "http://localhost:3000/api/admin/audit-logs/export"
    params = {
        "format": "json",
        "entityType": "book",
        "action": "update"
    }
    headers = {
        "Authorization": f"Bearer {admin_token}"
    }
    
    response = requests.get(url, params=params, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Exported {data['total']} logs")
        return data['data']
    else:
        print(f"Error: {response.status_code}")
        return None

# Поиск логов
def search_audit_logs(query):
    url = "http://localhost:3000/api/admin/audit-logs/search"
    params = {
        "query": query,
        "limit": 100
    }
    headers = {
        "Authorization": f"Bearer {admin_token}"
    }
    
    response = requests.get(url, params=params, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return data['data']['logs']
    else:
        print(f"Error: {response.status_code}")
        return None
```

---

## Тестирование

### С помощью curl

```bash
# 1. Получить токен администратора
TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.data.token')

# 2. Экспорт логов
curl -X GET "http://localhost:3000/api/admin/audit-logs/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o audit_logs.csv

# 3. Поиск логов
curl -X GET "http://localhost:3000/api/admin/audit-logs/search?query=название" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.logs[] | {description, entityName, createdAt}'
```

---

## Заметки

1. **Лимиты экспорта:** Максимум 10,000 записей за один запрос
2. **Лимиты поиска:** Максимум 100 результатов на странице
3. **Защита данных:** Личные данные автоматически скрываются в экспорте
4. **Кодировка:** CSV файлы экспортируются в UTF-8
5. **Формат дат:** Все даты в ISO 8601 формате (например: `2025-01-21T12:00:00.000Z`)

