import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { auditLogs, providerAcct, adminAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const TABLES = ["bv_requests", "baa_provider", "order_products", "coverage_plans", "cms_policy_updates"];
const ACTIONS = ["INSERT", "UPDATE", "UPDATE", "UPDATE", "DELETE"] as const;

export async function seedDemoAuditLogs(): Promise<number> {
  const db = getDb();

  const providerRows = await db
    .select({ id: providerAcct.id, userId: providerAcct.userId })
    .from(providerAcct)
    .where(eq(providerAcct.email, "demo-provider@dermaroute-demo.example.com"))
    .limit(1);

  const adminRows = await db
    .select({ userId: adminAcct.userId })
    .from(adminAcct)
    .where(eq(adminAcct.email, "demo-admin@dermaroute-demo.example.com"))
    .limit(1);

  const actorIds = [
    providerRows[0]?.userId ?? null,
    adminRows[0]?.userId ?? null,
  ].filter(Boolean) as string[];

  const rows = Array.from({ length: 50 }, (_, i) => ({
    tableName: faker.helpers.arrayElement(TABLES),
    recordId: faker.string.uuid(),
    action: ACTIONS[i % ACTIONS.length],
    actorId: actorIds.length > 0 ? faker.helpers.arrayElement(actorIds) : null,
    oldData: ACTIONS[i % ACTIONS.length] !== "INSERT" ? { status: "pending" } : null,
    newData: ACTIONS[i % ACTIONS.length] !== "DELETE" ? { status: faker.helpers.arrayElement(["approved", "rejected", "completed"]) } : null,
    createdAt: faker.date.recent({ days: 30 }),
  }));

  await db.insert(auditLogs).values(rows);

  return rows.length;
}
