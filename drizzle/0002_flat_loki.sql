CREATE TYPE "public"."baa_status" AS ENUM('signed', 'pending', 'approved', 'cancelled');--> statement-breakpoint
CREATE TABLE "baa_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_acct_id" uuid NOT NULL,
	"covered_entity" text NOT NULL,
	"covered_entity_name" text NOT NULL,
	"covered_entity_title" text NOT NULL,
	"covered_entity_date" text NOT NULL,
	"covered_entity_signature" text NOT NULL,
	"business_associate_name" text,
	"business_associate_title" text,
	"business_associate_date" text,
	"business_associate_signature" text,
	"status" "baa_status" DEFAULT 'pending' NOT NULL,
	"status_updated_by_admin_id" uuid,
	"status_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "baa_provider" ADD CONSTRAINT "baa_provider_provider_acct_id_provider_acct_id_fk" FOREIGN KEY ("provider_acct_id") REFERENCES "public"."provider_acct"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baa_provider" ADD CONSTRAINT "baa_provider_status_updated_by_admin_id_admin_acct_id_fk" FOREIGN KEY ("status_updated_by_admin_id") REFERENCES "public"."admin_acct"("id") ON DELETE set null ON UPDATE no action;