CREATE TYPE "public"."deal_stage" AS ENUM('new', 'in_discussion', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('email', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."pending_change_action" AS ENUM('create', 'update');--> statement-breakpoint
CREATE TYPE "public"."pending_change_entity_type" AS ENUM('contact', 'company', 'deal');--> statement-breakpoint
CREATE TYPE "public"."pending_change_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company_name" text,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company_name" text,
	"contact_email" text,
	"stage" "deal_stage" DEFAULT 'new' NOT NULL,
	"amount" integer,
	"next_action" text,
	"next_action_date" timestamp,
	"last_activity_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "interaction_type" NOT NULL,
	"datetime" timestamp NOT NULL,
	"participants" jsonb,
	"summary" text,
	"sentiment" "sentiment",
	"contact_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "pending_change_entity_type" NOT NULL,
	"action" "pending_change_action" NOT NULL,
	"data" jsonb NOT NULL,
	"source_data" jsonb NOT NULL,
	"status" "pending_change_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
