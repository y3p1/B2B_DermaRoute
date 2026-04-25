ALTER TABLE "insurance_provider_mappings" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "insurance_provider_mappings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "wound_sizes" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "wound_sizes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "manufacturer_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bv_requests" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "bv_requests" ADD COLUMN "verified_by_type" varchar(32);--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_products" ADD COLUMN "manufacturer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_products" DROP COLUMN "manufacturer";--> statement-breakpoint
ALTER TABLE "provider_acct" ADD CONSTRAINT "provider_acct_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "admin_acct" ADD CONSTRAINT "admin_acct_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "clinic_staff_acct" ADD CONSTRAINT "clinic_staff_acct_user_id_unique" UNIQUE("user_id");