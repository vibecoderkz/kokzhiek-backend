-- Add indexes to audit_logs table for fast searching
-- These indexes optimize the filters used in /api/admin/audit-logs endpoint

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id") WHERE "deleted_at" IS NULL;

-- Index for filtering by entity type (e.g., 'book', 'chapter', 'user')
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_idx" ON "audit_logs" ("entity_type") WHERE "deleted_at" IS NULL;

-- Index for filtering by entity ID (e.g., specific book ID)
CREATE INDEX IF NOT EXISTS "audit_logs_entity_id_idx" ON "audit_logs" ("entity_id") WHERE "deleted_at" IS NULL;

-- Index for filtering by action type ('create', 'update', 'delete', etc.)
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action") WHERE "deleted_at" IS NULL;

-- Index for filtering by date range (most common query pattern)
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at" DESC) WHERE "deleted_at" IS NULL;

-- Composite index for common filter combinations
-- Optimizes queries filtering by entity_type + entity_id + created_at
CREATE INDEX IF NOT EXISTS "audit_logs_entity_composite_idx" ON "audit_logs" ("entity_type", "entity_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Composite index for user activity queries
-- Optimizes queries filtering by user_id + action + created_at
CREATE INDEX IF NOT EXISTS "audit_logs_user_activity_idx" ON "audit_logs" ("user_id", "action", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Full-text search index for searching in descriptions (для поиска по ключевым словам)
-- This enables fast text search in the description field
CREATE INDEX IF NOT EXISTS "audit_logs_description_search_idx" ON "audit_logs" USING gin(to_tsvector('russian', COALESCE("description", ''))) WHERE "deleted_at" IS NULL;
