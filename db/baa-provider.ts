import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

import { approverRoleEnum, baaStatusEnum } from "./enums";
import { providerAcct } from "./provider";
import { adminAcct } from "./admin";

// Provider-submitted Business Associate Agreement (BAA)
// Stores Covered Entity fields filled by the provider + a later Business Associate signature by an approver.
export const baaProvider = pgTable("baa_provider", {
  id: uuid("id").primaryKey().defaultRandom(),

  providerAcctId: uuid("provider_acct_id")
    .notNull()
    .references(() => providerAcct.id, { onDelete: "cascade" }),

  // Covered Entity (filled by provider)
  coveredEntity: text("covered_entity").notNull(),
  coveredEntityName: text("covered_entity_name").notNull(),
  coveredEntityTitle: text("covered_entity_title").notNull(),
  coveredEntityDate: text("covered_entity_date").notNull(),
  coveredEntitySignature: text("covered_entity_signature").notNull(),

  // Business Associate (filled later by approver)
  businessAssociateName: text("business_associate_name"),
  businessAssociateTitle: text("business_associate_title"),
  businessAssociateDate: text("business_associate_date"),
  businessAssociateSignature: text("business_associate_signature"),

  // Approval workflow
  status: baaStatusEnum("status").notNull().default("pending"),
  statusUpdatedByAdminId: uuid("status_updated_by_admin_id").references(
    () => adminAcct.id,
    { onDelete: "set null" },
  ),
  // New: supports both admin + clinic staff approvers (auth.users id)
  statusUpdatedByUserId: uuid("status_updated_by_user_id"),
  statusUpdatedByRole: approverRoleEnum("status_updated_by_role"),
  statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
