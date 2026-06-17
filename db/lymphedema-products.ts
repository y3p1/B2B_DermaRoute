import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const lymphedemaProducts = pgTable("lymphedema_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  device: text("device"),
  hcpcs: text("hcpcs"),
  garmentType: text("garment_type"),
  garmentStyle: text("garment_style"),
  compressionLevel: text("compression_level"),
  manufacturer: text("manufacturer"),
  extremityType: text("extremity_type"),
  description: text("description"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
