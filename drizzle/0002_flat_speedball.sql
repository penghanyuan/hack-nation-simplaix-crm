CREATE TYPE "public"."activity_entity_type" AS ENUM('contact', 'task');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "activity_entity_type" NOT NULL,
	"status" "activity_status" DEFAULT 'pending' NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"source_interaction_id" uuid,
	"source_email_subject" text,
	"source_email_from" text,
	"source_email_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_source_interaction_id_interactions_id_fk" FOREIGN KEY ("source_interaction_id") REFERENCES "public"."interactions"("id") ON DELETE no action ON UPDATE no action;