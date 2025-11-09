CREATE TYPE "public"."activity_source_type" AS ENUM('email', 'meeting', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."transcript_status" AS ENUM('pending', 'processing', 'processed', 'error');--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp NOT NULL,
	"content_type" text,
	"status" "transcript_status" DEFAULT 'pending' NOT NULL,
	"content" text,
	"metadata" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcripts_blob_url_unique" UNIQUE("blob_url")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "source_type" "activity_source_type" DEFAULT 'email' NOT NULL;