import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { manufacturers } from "./manufacturers";
import { woundSizes } from "./bv-products";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  qCode: varchar("q_code", { length: 50 }), // Q4169, Q4256, MUE-148, etc.
  name: varchar("name", { length: 255 }).notNull(),
  manufacturerId: uuid("manufacturer_id").references(() => manufacturers.id),
  woundSizeId: uuid("wound_size_id").references(() => woundSizes.id),
  // insuranceId removed: now use commercial boolean for insurance type
  // true = commercial insurance product, false = non-commercial (Medicare/Medicaid)
  commercial: boolean("commercial").notNull().default(false),
  unitSize: integer("unit_size"), // 2, 4, 16, 32, etc.
  payRatePerCm2: numeric("pay_rate_per_cm2", { precision: 10, scale: 2 }),
  costPerCm2: numeric("cost_per_cm2", { precision: 10, scale: 2 }),
  payRatePerGraft: numeric("pay_rate_per_graft", { precision: 10, scale: 2 }),
  costPerGraft: numeric("cost_per_graft", { precision: 10, scale: 2 }),
  estAoc100: numeric("est_aoc_100", { precision: 10, scale: 2 }), // Est AOC @ 100%
  estAoc80: numeric("est_aoc_80", { precision: 10, scale: 2 }), // Est. AOC @ 80%
  description: text("description"),
  quarter: integer("quarter").notNull(), // 1, 2, 3, 4
  year: integer("year").notNull(),
  commission: numeric("commission", { precision: 5, scale: 4 }), // e.g. 0.6000 for 60%
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
