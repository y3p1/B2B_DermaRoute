CREATE TABLE "admin_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
);
