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
ALTER TABLE "baa_provider" ADD COLUMN "status_updated_by_role" "approver_role";--> statement-breakpoint

-- Backfill clinic staff into new table
INSERT INTO "clinic_staff_acct" (
  "account_phone",
  "email",
  "first_name",
  "last_name",
  "user_id",
  "active",
  "created_at",
  "updated_at"
)
SELECT
  a."account_phone",
  a."email",
  a."first_name",
  a."last_name",
  a."user_id",
  a."active",
  a."created_at",
  a."updated_at"
FROM "admin_acct" a
WHERE a."role" = 'clinic_staff'
ON CONFLICT ("account_phone") DO NOTHING;
--> statement-breakpoint

-- Backfill BAA approver info for historical records
UPDATE "baa_provider" b
SET
  "status_updated_by_user_id" = a."user_id",
  "status_updated_by_role" = 'clinic_staff'
FROM "admin_acct" a
WHERE b."status_updated_by_admin_id" = a."id" AND a."role" = 'clinic_staff';
--> statement-breakpoint

UPDATE "baa_provider" b
SET
  "status_updated_by_user_id" = a."user_id",
  "status_updated_by_role" = 'admin'
FROM "admin_acct" a
WHERE b."status_updated_by_admin_id" = a."id" AND a."role" = 'admin' AND b."status_updated_by_user_id" IS NULL;
--> statement-breakpoint

-- Move clinic staff out of admin_acct
DELETE FROM "admin_acct" WHERE "role" = 'clinic_staff';
