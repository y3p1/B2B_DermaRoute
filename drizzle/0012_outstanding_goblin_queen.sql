ALTER TABLE "products" DROP CONSTRAINT "products_insurance_id_insurances_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "insurance_id";