CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text DEFAULT 'default' NOT NULL,
	"gmail_access_token" text,
	"gmail_refresh_token" text,
	"gmail_token_expiry" timestamp,
	"auto_approve_mode" boolean DEFAULT false NOT NULL,
	"last_gmail_sync" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
