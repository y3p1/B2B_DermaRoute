import {
  pgTable,
  uuid,
  boolean,
  integer,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { orderProducts } from "./bv-products";
import { bvRequests } from "./bv-requests";

// Order outcomes (Roadmap #10a — Admin Analytics foundation)
// One row per logged outcome for an order. Feeds the success-rate lookup
// and the analytics feedback loop in the admin dashboard.
export const orderOutcomes = pgTable("order_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderProductId: uuid("order_product_id")
    .references(() => orderProducts.id, { onDelete: "cascade" })
    .notNull(),
  bvRequestId: uuid("bv_request_id").references(() => bvRequests.id, {
    onDelete: "set null",
  }),
  healed: boolean("healed"),
  weeksToHeal: integer("weeks_to_heal"),
  complications: text("complications"),
  applicationCount: integer("application_count"),
  recordedBy: uuid("recorded_by"),
  recordedByType: varchar("recorded_by_type", { length: 32 }), // 'admin' | 'clinic_staff' | 'provider'
  recordedAt: timestamp("recorded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
