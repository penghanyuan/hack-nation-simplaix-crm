CREATE TYPE "public"."email_status" AS ENUM('pending', 'processing', 'processed', 'error');--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gmail_id" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"to_email" text,
	"received_at" timestamp NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "emails_gmail_id_unique" UNIQUE("gmail_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "email_sync_hours" integer DEFAULT 12 NOT NULL;