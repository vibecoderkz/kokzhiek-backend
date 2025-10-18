DO $$ BEGIN
 CREATE TYPE "audit_action" AS ENUM('create', 'update', 'delete', 'login', 'logout', 'access');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"description" text,
	"extra_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "last_edited_by" uuid;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "last_edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "last_edit_action" varchar(255);