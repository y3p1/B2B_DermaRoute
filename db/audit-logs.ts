import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// Audit Logs — captures every INSERT, UPDATE, DELETE on audited tables.
// Rows are inserted by PostgreSQL trigger functions, not application code,
// so every write is captured regardless of source (API, Supabase dashboard, script).
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: varchar("table_name", { length: 128 }).notNull(),
  recordId: text("record_id").notNull(), // the PK of the affected row
  action: varchar("action", { length: 16 }).notNull(), // INSERT | UPDATE | DELETE
  actorId: uuid("actor_id"), // auth.uid() at trigger time — null if service-role
  oldData: jsonb("old_data"), // row snapshot before change (null for INSERT)
  newData: jsonb("new_data"), // row snapshot after change (null for DELETE)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
