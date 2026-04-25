import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const thresholdSettings = pgTable("threshold_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: uuid("updated_by"),
});
