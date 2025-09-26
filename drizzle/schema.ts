import { pgTable, pgEnum, uuid, varchar, jsonb, integer, timestamp, text, boolean, unique } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['student', 'teacher', 'school', 'author', 'moderator', 'admin'])


export const blocks = pgTable("blocks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	chapterId: uuid("chapter_id").notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	content: jsonb("content").notNull(),
	style: jsonb("style").default({}),
	position: integer("position").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const bookCollaborators = pgTable("book_collaborators", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar("role", { length: 50 }).default('viewer'::character varying).notNull(),
	invitedBy: uuid("invited_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const books = pgTable("books", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	coverImageUrl: text("cover_image_url"),
	ownerId: uuid("owner_id").notNull(),
	schoolId: uuid("school_id"),
	isPublic: boolean("is_public").default(false),
	visibility: varchar("visibility", { length: 50 }).default('private'::character varying),
	settings: jsonb("settings").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const chapters = pgTable("chapters", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	bookId: uuid("book_id").notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	position: integer("position").notNull(),
	settings: jsonb("settings").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const mediaFiles = pgTable("media_files", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	filename: varchar("filename", { length: 255 }).notNull(),
	originalName: varchar("original_name", { length: 255 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	size: integer("size").notNull(),
	url: text("url").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const registrationKeys = pgTable("registration_keys", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	keyCode: varchar("key_code", { length: 255 }).notNull(),
	role: userRole("role").notNull(),
	description: text("description"),
	maxUses: integer("max_uses").default(1),
	currentUses: integer("current_uses").default(0),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		registrationKeysKeyCodeUnique: unique("registration_keys_key_code_unique").on(table.keyCode),
	}
});

export const schools = pgTable("schools", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	address: text("address"),
	websiteUrl: varchar("website_url", { length: 255 }),
	logoUrl: text("logo_url"),
	settings: jsonb("settings").default({}),
	isActive: boolean("is_active").default(true),
	adminId: uuid("admin_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: varchar("token_hash", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	avatarUrl: text("avatar_url"),
	emailVerified: boolean("email_verified").default(false),
	emailVerificationToken: varchar("email_verification_token", { length: 255 }),
	passwordResetToken: varchar("password_reset_token", { length: 255 }),
	passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true, mode: 'string' }),
	role: userRole("role").notNull(),
	registrationKeyId: uuid("registration_key_id"),
	schoolId: uuid("school_id"),
	organizationInfo: jsonb("organization_info").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	teacherId: uuid("teacher_id"),
},
(table) => {
	return {
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});