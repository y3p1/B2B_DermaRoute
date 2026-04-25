CREATE TYPE "public"."provider_role" AS ENUM('admin', 'clinic_staff', 'provider');--> statement-breakpoint
CREATE TABLE "provider_acct" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_phone" text NOT NULL,
	"email" text NOT NULL,
	"npi_number" text NOT NULL,
	"clinic_name" text NOT NULL,
	"clinic_address" text,
	"clinic_phone" text,
	"provider_specialty" text,
	"tax_id" text,
	"group_npi" text,
	"role" "provider_role" DEFAULT 'provider' NOT NULL,
	"user_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "provider_acct_account_phone_unique" UNIQUE("account_phone")
);
--> statement-breakpoint
CREATE TABLE "bv_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" uuid,
	"provider" varchar(128),
	"place_of_service" varchar(64),
	"insurance" varchar(64),
	"wound_type" varchar(64),
	"wound_size" varchar(32),
	"wound_location" varchar(128),
	"icd10" varchar(32),
	"conservative_therapy" boolean,
	"diabetic" boolean,
	"tunneling" boolean,
	"infected" boolean,
	"initials" varchar(16),
	"application_date" date,
	"delivery_date" date,
	"instructions" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bv_requests" ADD CONSTRAINT "bv_requests_provider_id_provider_acct_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_acct"("id") ON DELETE no action ON UPDATE no action;