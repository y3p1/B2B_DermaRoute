import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * bv_forms — stores metadata for BV (Biologic/Wound-Care) PDF forms.
 * The actual PDF is stored in the Supabase Storage bucket "bv-forms".
 * file_path is the object path within that bucket (e.g. "ox/form-q12026.pdf").
 */
export const bvForms = pgTable("bv_forms", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** Display name for the form, e.g. "OX Q1 2026 BV Request Form" */
  name: varchar("name", { length: 255 }).notNull(),

  /**
   * Manufacturer short-name this form belongs to.
   * Kept as a plain varchar so new manufacturers can be added without a DB
   * migration. Convention: lowercase, e.g. "ox", "tide", "tiger",
   * "extremity", "venture".
   */
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),

  /** Description / notes for the form */
  description: text("description"),

  /** Object path inside the "bv-forms" Supabase Storage bucket */
  filePath: varchar("file_path", { length: 1024 }).notNull(),

  /** Original file name as uploaded, e.g. "OX_BV_Form_Q12026.pdf" */
  fileName: varchar("file_name", { length: 255 }).notNull(),

  /** File size in bytes */
  fileSize: integer("file_size"),

  /**
   * When TRUE, this form applies to commercial insurance plans.
   * When FALSE, it applies to non-commercial (Medicare/Medicaid) plans.
   * NULL means it applies to both types.
   */
  commercial: boolean("commercial"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
