import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { insurances } from "./insurances";
import { manufacturers } from "./manufacturers";

export const insuranceRouting = pgTable(
  "insurance_routing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    insuranceId: uuid("insurance_id")
      .references(() => insurances.id)
      .notNull(),
    manufacturerId: uuid("manufacturer_id")
      .references(() => manufacturers.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [unique().on(table.insuranceId, table.manufacturerId)],
);
