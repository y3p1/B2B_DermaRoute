import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { adminAcct } from "./admin";

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: uuid("updated_by").references(() => adminAcct.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
