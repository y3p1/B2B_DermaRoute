BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a new table with uuid primary key and same columns
CREATE TABLE IF NOT EXISTS "bv_requests_new" (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	provider_id uuid,
	provider varchar(128),
	place_of_service varchar(64),
	insurance varchar(64),
	wound_type varchar(64),
	wound_size varchar(32),
	wound_location varchar(128),
	icd10 varchar(32),
	conservative_therapy boolean,
	diabetic boolean,
	tunneling boolean,
	infected boolean,
	initials varchar(16),
	application_date date,
	delivery_date date,
	instructions text,
	status varchar(32) NOT NULL DEFAULT 'pending',
	created_at timestamp DEFAULT now(),
	updated_at timestamp DEFAULT now()
);

-- Preserve foreign key to provider_acct
ALTER TABLE "bv_requests_new" ADD CONSTRAINT bv_requests_new_provider_id_provider_acct_id_fk FOREIGN KEY (provider_id) REFERENCES provider_acct(id);

-- Copy data from old table into new table, generating new uuids
INSERT INTO "bv_requests_new" (
	provider_id, provider, place_of_service, insurance, wound_type, wound_size, wound_location, icd10,
	conservative_therapy, diabetic, tunneling, infected, initials, application_date, delivery_date, instructions,
	status, created_at, updated_at
)
SELECT
	provider_id, provider, place_of_service, insurance, wound_type, wound_size, wound_location, icd10,
	conservative_therapy, diabetic, tunneling, infected, initials, application_date, delivery_date, instructions,
	status, created_at, updated_at
FROM "bv_requests";

-- Replace old table
DROP TABLE IF EXISTS "bv_requests";
ALTER TABLE "bv_requests_new" RENAME TO "bv_requests";

COMMIT;