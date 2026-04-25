CREATE TABLE "insurance_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurance_id" uuid NOT NULL,
	"manufacturer_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "insurance_routing_insurance_id_manufacturer_id_unique" UNIQUE("insurance_id","manufacturer_id")
);
--> statement-breakpoint
ALTER TABLE "insurance_routing" ADD CONSTRAINT "insurance_routing_insurance_id_insurances_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "public"."insurances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_routing" ADD CONSTRAINT "insurance_routing_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;