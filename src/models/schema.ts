import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['admin', 'moderator', 'author', 'school', 'teacher', 'student']);

export const registrationKeys = pgTable('registration_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyCode: varchar('key_code', { length: 255 }).unique().notNull(),
  role: userRoleEnum('role').notNull(),
  description: text('description'),
  maxUses: integer('max_uses').default(1),
  currentUses: integer('current_uses').default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires', { withTimezone: true }),
  role: userRoleEnum('role').notNull(),
  registrationKeyId: uuid('registration_key_id'),
  schoolId: uuid('school_id'),
  teacherId: uuid('teacher_id'),
  isActive: boolean('is_active').default(true),
  organizationInfo: jsonb('organization_info').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  address: text('address'),
  websiteUrl: varchar('website_url', { length: 255 }),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  adminId: uuid('admin_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  author: text('author'),
  class: varchar('class', { length: 10 }),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  ownerId: uuid('owner_id').notNull(),
  schoolId: uuid('school_id'),
  isPublic: boolean('is_public').default(false),
  visibility: varchar('visibility', { length: 50 }).default('private'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  position: integer('position').notNull(),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  content: jsonb('content').notNull(),
  style: jsonb('style').default({}),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const bookCollaborators = pgTable('book_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('viewer'),
  invitedBy: uuid('invited_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  registrationKey: one(registrationKeys, {
    fields: [users.registrationKeyId],
    references: [registrationKeys.id],
  }),
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  teacher: one(users, {
    fields: [users.teacherId],
    references: [users.id],
    relationName: 'teacher_students'
  }),
  students: many(users, {
    relationName: 'teacher_students'
  }),
  ownedBooks: many(books),
  collaborations: many(bookCollaborators),
  sessions: many(sessions),
  mediaFiles: many(mediaFiles),
}));

export const registrationKeysRelations = relations(registrationKeys, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [registrationKeys.createdBy],
    references: [users.id],
  }),
  usedByUsers: many(users),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  admin: one(users, {
    fields: [schools.adminId],
    references: [users.id],
  }),
  users: many(users),
  books: many(books),
  registrationKeys: many(registrationKeys),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  owner: one(users, {
    fields: [books.ownerId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [books.schoolId],
    references: [schools.id],
  }),
  chapters: many(chapters),
  collaborators: many(bookCollaborators),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id],
  }),
  blocks: many(blocks),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  chapter: one(chapters, {
    fields: [blocks.chapterId],
    references: [chapters.id],
  }),
}));

export const bookCollaboratorsRelations = relations(bookCollaborators, ({ one }) => ({
  book: one(books, {
    fields: [bookCollaborators.bookId],
    references: [books.id],
  }),
  user: one(users, {
    fields: [bookCollaborators.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [bookCollaborators.invitedBy],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  user: one(users, {
    fields: [mediaFiles.userId],
    references: [users.id],
  }),
}));