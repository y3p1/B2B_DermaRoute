import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const originalUrl = process.env.DATABASE_URL!;
const transactionPoolUrl = originalUrl.replace(":5432/", ":6543/");
const sql = postgres(transactionPoolUrl, { prepare: false });

async function fixFk() {
  console.log("1. Making product_id nullable...");
  await sql`ALTER TABLE order_products ALTER COLUMN product_id DROP NOT NULL`;

  console.log("2. Dropping old FK constraint...");
  await sql`ALTER TABLE order_products DROP CONSTRAINT IF EXISTS order_products_product_id_products_id_fk`;

  console.log("3. Adding new FK with ON DELETE SET NULL...");
  await sql`ALTER TABLE order_products ADD CONSTRAINT order_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL`;

  console.log("Done! product_id FK now uses SET NULL on delete.");
  await sql.end();
}

fixFk().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
