CREATE TYPE "public"."approver_role" AS ENUM('admin', 'clinic_staff');--> statement-breakpoint
CREATE TABLE "clinic_staff_acct" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_phone" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"user_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "clinic_staff_acct_account_phone_unique" UNIQUE("account_phone")
);
--> statement-breakpoint
ALTER TABLE "baa_provider" ADD COLUMN "status_updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "baa_provider" ADD COLUMN "status_updated_by_role" "approver_role";