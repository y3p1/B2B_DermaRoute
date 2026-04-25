CREATE TABLE "insurances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"commercial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "insurances_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "insurance_provider_mappings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ordering_providers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "insurance_provider_mappings" CASCADE;--> statement-breakpoint
DROP TABLE "ordering_providers" CASCADE;--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "bv_request_id" uuid;--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "status" varchar(32) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "created_by_type" varchar(32);--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "q_code" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "wound_size_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "insurance_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_size" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pay_rate_per_cm2" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_per_cm2" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pay_rate_per_graft" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_per_graft" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "est_aoc_100" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "est_aoc_80" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_bv_request_id_bv_requests_id_fk" FOREIGN KEY ("bv_request_id") REFERENCES "public"."bv_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_wound_size_id_wound_sizes_id_fk" FOREIGN KEY ("wound_size_id") REFERENCES "public"."wound_sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_insurance_id_insurances_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "public"."insurances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" DROP COLUMN "ordering_providers";