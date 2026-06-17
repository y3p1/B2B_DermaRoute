import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "prefer" });

  console.log("Applying Phase 1.1 schema...");

  try {
    // 1. practice_tracks
    await sql`
      CREATE TABLE IF NOT EXISTS practice_tracks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id uuid REFERENCES provider_acct(id) ON DELETE CASCADE,
        track text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (provider_id, track)
      )
    `;
    console.log("✓ practice_tracks");

    // 2. system_settings
    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key text PRIMARY KEY,
        value text NOT NULL,
        updated_by uuid REFERENCES admin_acct(id) ON DELETE SET NULL,
        updated_at timestamptz DEFAULT now()
      )
    `;
    console.log("✓ system_settings");

    // 3. lymphedema_products
    await sql`
      CREATE TABLE IF NOT EXISTS lymphedema_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        device text NOT NULL,
        hcpcs text,
        garment_type text,
        garment_style text,
        compression_level text,
        manufacturer text,
        extremity_type text,
        description text,
        archived boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `;
    console.log("✓ lymphedema_products");

    // 4. ocular_products
    await sql`
      CREATE TABLE IF NOT EXISTS ocular_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        product_variant text NOT NULL,
        size_mm integer NOT NULL,
        sku text NOT NULL UNIQUE,
        description text,
        archived boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `;
    console.log("✓ ocular_products");

    // 5. lymphedema_orders
    await sql`
      CREATE TABLE IF NOT EXISTS lymphedema_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id uuid REFERENCES provider_acct(id) ON DELETE SET NULL,
        submitted_by uuid,
        ordering_provider_id uuid REFERENCES provider_acct(id) ON DELETE SET NULL,
        patient jsonb,
        insurance text,
        place_of_service text,
        diagnosis jsonb,
        conservative_therapy_completed boolean,
        skin_changes jsonb,
        extremity jsonb,
        measurements jsonb,
        device text,
        hcpcs text,
        device_recommended boolean,
        garment_type text,
        garment_style text,
        compression_level text,
        quantity integer,
        custom_made boolean,
        manufacturer_preference text,
        distal_pressure_mmhg integer,
        times_per_day integer,
        minutes_per_session integer,
        pdf_url text,
        status varchar(32) NOT NULL DEFAULT 'pending',
        submission_email_used text,
        submitted_at timestamptz,
        lymphedema_product_id uuid REFERENCES lymphedema_products(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `;
    console.log("✓ lymphedema_orders");

    // 6. ocular_orders
    await sql`
      CREATE TABLE IF NOT EXISTS ocular_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id uuid REFERENCES provider_acct(id) ON DELETE SET NULL,
        submitted_by uuid,
        ordering_provider_id uuid REFERENCES provider_acct(id) ON DELETE SET NULL,
        patient jsonb,
        primary_diagnosis text,
        secondary_diagnosis text,
        eye varchar(16),
        product_variant varchar(16),
        size_mm integer,
        sku text,
        quantity integer,
        date_needed_by date,
        ship_to jsonb,
        special_instructions text,
        insurance_payer text,
        insurance_member_id text,
        pdf_url text,
        status varchar(32) NOT NULL DEFAULT 'pending',
        submission_email_used text,
        submitted_at timestamptz,
        ocular_product_id uuid REFERENCES ocular_products(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `;
    console.log("✓ ocular_orders");

    console.log("\nAll Phase 1.1 tables created successfully.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
