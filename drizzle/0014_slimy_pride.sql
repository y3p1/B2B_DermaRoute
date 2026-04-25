CREATE TABLE "bv_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"manufacturer" varchar(100) NOT NULL,
	"description" text,
	"file_path" varchar(1024) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
