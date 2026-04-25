import { desc, eq, and, gte, lte, sql, ilike } from "drizzle-orm";
import { getDb } from "./db";
import { auditLogs } from "../../db/audit-logs";

export type AuditLogFilters = {
  tableName?: string;
  action?: string;
  actorId?: string;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  search?: string;    // search across record_id, table_name
  page?: number;
  limit?: number;
};

export type AuditLogRow = {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  actorId: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: Date | null;
};

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<{
  data: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}> {
  const db = getDb();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (filters.tableName) {
    conditions.push(eq(auditLogs.tableName, filters.tableName));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.actorId) {
    conditions.push(eq(auditLogs.actorId, filters.actorId));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
  }
  if (filters.search) {
    conditions.push(ilike(auditLogs.recordId, `%${filters.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      tableName: r.tableName,
      recordId: r.recordId,
      action: r.action,
      actorId: r.actorId,
      oldData: r.oldData,
      newData: r.newData,
      createdAt: r.createdAt,
    })),
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  };
}

// Get distinct table names from audit logs (for filter dropdown)
export async function getAuditedTableNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ tableName: auditLogs.tableName })
    .from(auditLogs)
    .orderBy(auditLogs.tableName);
  return rows.map((r) => r.tableName);
}
