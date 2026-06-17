import { pgTable, uuid, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const ocularProducts = pgTable("ocular_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  productVariant: text("product_variant").notNull(),
  sizeMm: integer("size_mm").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
