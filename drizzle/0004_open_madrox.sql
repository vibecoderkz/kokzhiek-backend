ALTER TABLE "books" ADD COLUMN "authors" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "grade" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "isbn" varchar(50);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publisher" varchar(255);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "edition" varchar(100);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "subject" varchar(100);--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "language" varchar(10) DEFAULT 'kz';