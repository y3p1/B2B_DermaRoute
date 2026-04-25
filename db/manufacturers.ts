import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const manufacturers = pgTable("manufacturers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  // true = commercial insurance manufacturer, false = non-commercial (Medicare/Medicaid)
  commercial: boolean("commercial").notNull().default(false),
  quarter: integer("quarter").notNull(), // 1, 2, 3, 4
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
