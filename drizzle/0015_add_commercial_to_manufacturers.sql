-- Add commercial boolean to manufacturers table
-- true = commercial insurance manufacturer, false = non-commercial (Medicare/Medicaid)
ALTER TABLE "manufacturers" ADD COLUMN "commercial" boolean NOT NULL DEFAULT false;
