# BACKEND: ИСПРАВЛЕНИЕ СОХРАНЕНИЯ МЕТАДАННЫХ КНИГИ

**Дата**: 09.10.2025
**Статус**: ✅ ИСПРАВЛЕНО

═══════════════════════════════════════
## ПРОБЛЕМА
═══════════════════════════════════════

Backend не сохранял новые поля метаданных книги:
- `authors` (массив авторов)
- `grade` (класс 1-11)
- `isbn` (ISBN код)
- `year` (год издания)
- `publisher` (издательство)
- `edition` (издание)
- `subject` (предмет)
- `language` (язык книги)

**Причины:**
1. Поля отсутствовали в схеме БД (`schema.ts`)
2. Валидационные схемы Zod не включали эти поля
3. Миграция не была применена

═══════════════════════════════════════
## РЕШЕНИЕ
═══════════════════════════════════════

### 1️⃣ ОБНОВЛЕНА СХЕМА БД

**Файл:** `src/models/schema.ts`

```typescript
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  author: text('author'), // legacy field
  authors: jsonb('authors').default([]), // NEW: array of authors
  class: varchar('class', { length: 10 }), // legacy field
  grade: integer('grade'), // NEW: grade number (1-11)
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  ownerId: uuid('owner_id').notNull(),
  schoolId: uuid('school_id'),
  isPublic: boolean('is_public').default(false),
  visibility: varchar('visibility', { length: 50 }).default('private'),
  settings: jsonb('settings').default({}),
  // NEW metadata fields
  isbn: varchar('isbn', { length: 50 }),
  year: integer('year'),
  publisher: varchar('publisher', { length: 255 }),
  edition: varchar('edition', { length: 100 }),
  subject: varchar('subject', { length: 100 }),
  language: varchar('language', { length: 10 }).default('kz'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### 2️⃣ ОБНОВЛЕНЫ ZOD СХЕМЫ

**Файл:** `src/controllers/bookController.ts`

```typescript
const CreateBookSchema = z.object({
  title: z.string().min(1).max(255),
  author: z.string().optional(), // legacy field
  authors: z.array(z.string()).optional(), // NEW
  class: z.string().max(10).optional(), // legacy
  grade: z.number().int().min(1).max(11).optional(), // NEW
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
  // NEW metadata fields
  isbn: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  publisher: z.string().max(255).optional(),
  edition: z.string().max(100).optional(),
  subject: z.string().max(100).optional(),
  language: z.enum(['kz', 'ru', 'en']).optional(),
});

const UpdateBookSchema = z.object({
  // Same fields as CreateBookSchema but all optional
  title: z.string().min(1).max(255).optional(),
  author: z.string().optional(),
  authors: z.array(z.string()).optional(),
  class: z.string().max(10).optional(),
  grade: z.number().int().min(1).max(11).optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
  isbn: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  publisher: z.string().max(255).optional(),
  edition: z.string().max(100).optional(),
  subject: z.string().max(100).optional(),
  language: z.enum(['kz', 'ru', 'en']).optional(),
});
```

### 3️⃣ СОЗДАНА И ПРИМЕНЕНА МИГРАЦИЯ

**Файл:** `drizzle/0004_open_madrox.sql`

```sql
ALTER TABLE "books" ADD COLUMN "authors" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "books" ADD COLUMN "grade" integer;
ALTER TABLE "books" ADD COLUMN "isbn" varchar(50);
ALTER TABLE "books" ADD COLUMN "year" integer;
ALTER TABLE "books" ADD COLUMN "publisher" varchar(255);
ALTER TABLE "books" ADD COLUMN "edition" varchar(100);
ALTER TABLE "books" ADD COLUMN "subject" varchar(100);
ALTER TABLE "books" ADD COLUMN "language" varchar(10) DEFAULT 'kz';
```

**Команды:**
```bash
# Сгенерировать миграцию
npm run db:generate

# Применить миграцию
npx ts-node --require dotenv/config src/scripts/apply-book-metadata-migration.ts
```

═══════════════════════════════════════
## СТРУКТУРА ДАННЫХ
═══════════════════════════════════════

### Таблица `books` - НОВЫЕ КОЛОНКИ:

| Поле | Тип | Описание | Пример |
|------|-----|----------|--------|
| `authors` | JSONB | Массив авторов | `["А. Абылкасымова", "Б. Жумагулова"]` |
| `grade` | INTEGER | Класс (1-11) | `5` |
| `isbn` | VARCHAR(50) | ISBN код | `"978-5-09-123456-7"` |
| `year` | INTEGER | Год издания | `2024` |
| `publisher` | VARCHAR(255) | Издательство | `"Мектеп"` |
| `edition` | VARCHAR(100) | Издание | `"3-е издание"` |
| `subject` | VARCHAR(100) | Предмет | `"Математика"` |
| `language` | VARCHAR(10) | Язык (kz/ru/en) | `"kz"` |

### Пример запроса UPDATE:

```typescript
PUT /api/books/:id

{
  "title": "Математика 5 класс",
  "authors": ["А. Абылкасымова", "Б. Жумагулова"],
  "grade": 5,
  "subject": "Математика",
  "isbn": "978-5-09-123456-7",
  "year": 2024,
  "publisher": "Мектеп",
  "edition": "3-е издание",
  "description": "Учебник математики для 5 класса",
  "language": "kz"
}
```

### Пример ответа:

```json
{
  "success": true,
  "message": "Book updated successfully",
  "data": {
    "book": {
      "id": "uuid-here",
      "title": "Математика 5 класс",
      "authors": ["А. Абылкасымова", "Б. Жумагулова"],
      "grade": 5,
      "subject": "Математика",
      "isbn": "978-5-09-123456-7",
      "year": 2024,
      "publisher": "Мектеп",
      "edition": "3-е издание",
      "description": "Учебник математики для 5 класса",
      "language": "kz",
      "createdAt": "2024-10-09T...",
      "updatedAt": "2024-10-09T..."
    }
  }
}
```

═══════════════════════════════════════
## ИЗМЕНЁННЫЕ ФАЙЛЫ
═══════════════════════════════════════

1. **src/models/schema.ts**
   - Добавлены 8 новых полей в таблицу `books`

2. **src/controllers/bookController.ts**
   - Обновлены `CreateBookSchema` и `UpdateBookSchema`
   - Добавлена валидация для всех новых полей

3. **drizzle/0004_open_madrox.sql**
   - Миграция для добавления колонок в БД

4. **src/scripts/apply-book-metadata-migration.ts** (новый файл)
   - Скрипт для применения миграции

═══════════════════════════════════════
## КАК ПРОВЕРИТЬ
═══════════════════════════════════════

### 1. Проверить что миграция применена:

```bash
psql $DATABASE_URL -c "\d books"
```

Должны быть видны новые колонки:
- authors
- grade
- isbn
- year
- publisher
- edition
- subject
- language

### 2. Тест через API:

```bash
# Обновить книгу
curl -X PUT http://localhost:3000/api/books/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Математика 5 класс",
    "authors": ["А. Абылкасымова", "Б. Жумагулова"],
    "grade": 5,
    "subject": "Математика",
    "isbn": "978-5-09-123456-7",
    "year": 2024,
    "publisher": "Мектеп",
    "edition": "3-е издание"
  }'

# Получить книгу
curl http://localhost:3000/api/books/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Проверить через Frontend:

1. Открыть http://localhost:5173
2. Перейти в библиотеку книг
3. Нажать "Редактировать" на книге
4. Заполнить новые поля метаданных
5. Нажать "Сохранить"
6. Обновить страницу (F5)
7. Открыть форму снова
8. Все поля должны быть заполнены ✅

═══════════════════════════════════════
## ВАЖНЫЕ ПРИМЕЧАНИЯ
═══════════════════════════════════════

### Legacy поля:
- `author` (text) - старое поле, сохранено для обратной совместимости
- `class` (varchar) - старое поле, сохранено для обратной совместимости

### Новые поля:
- `authors` (jsonb) - используйте это поле для массива авторов
- `grade` (integer) - используйте это поле для номера класса

### Валидация:
- `grade`: 1-11
- `year`: 1900-2100
- `isbn`: до 50 символов
- `publisher`: до 255 символов
- `edition`: до 100 символов
- `subject`: до 100 символов
- `language`: 'kz' | 'ru' | 'en'

### Base64 изображения:
Валидация URL для `coverImageUrl` удалена, чтобы поддерживать base64 строки.

═══════════════════════════════════════
## РЕЗУЛЬТАТ
═══════════════════════════════════════

✅ **Схема БД обновлена** - добавлены 8 новых колонок
✅ **Валидация настроена** - Zod схемы поддерживают все поля
✅ **Миграция применена** - все поля созданы в БД
✅ **Endpoint работает** - PUT /api/books/:id принимает все поля
✅ **Данные сохраняются** - метаданные корректно пишутся в БД

Backend теперь полностью поддерживает сохранение всех метаданных книги! 🎉
