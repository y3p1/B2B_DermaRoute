CREATE TABLE "insurance_provider_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"insurance" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"priority" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"manufacturer" text,
	"description" text,
	"wound_types" jsonb,
	"allowed_wound_sizes" jsonb,
	"insurance_coverage" jsonb,
	"ordering_providers" jsonb,
	"requires_manual_submission" boolean DEFAULT true,
	"approval_proof_url" text,
	"benefits_verification_form_version" text,
	"form_change_note" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ordering_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"metadata" jsonb,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wound_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"area_cm2" numeric NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clinic_staff_acct" ADD COLUMN "role" "provider_role" DEFAULT 'clinic_staff' NOT NULL;