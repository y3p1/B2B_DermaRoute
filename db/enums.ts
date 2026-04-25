import { pgEnum } from "drizzle-orm/pg-core";

// Provider account roles enum
export const providerRoleEnum = pgEnum("provider_role", [
  "admin",
  "clinic_staff",
  "provider",
]);

// Approver roles for workflows that can be handled by admins or clinic staff
export const approverRoleEnum = pgEnum("approver_role", [
  "admin",
  "clinic_staff",
]);

// Business Associate Agreement workflow status
export const baaStatusEnum = pgEnum("baa_status", [
  "signed",
  "pending",
  "approved",
  "cancelled",
]);
