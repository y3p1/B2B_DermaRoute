import type { Request, Response } from "../http/types";
import { getAuditLogs, getAuditedTableNames } from "../services/auditLog.service";

export async function listAuditLogsController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const params = url.searchParams;

    const result = await getAuditLogs({
      tableName: params.get("tableName") || undefined,
      action: params.get("action") || undefined,
      actorId: params.get("actorId") || undefined,
      startDate: params.get("startDate") || undefined,
      endDate: params.get("endDate") || undefined,
      search: params.get("search") || undefined,
      page: params.get("page") ? parseInt(params.get("page")!, 10) : undefined,
      limit: params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get audit logs";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function listAuditedTablesController(_req: Request, res: Response) {
  try {
    const tables = await getAuditedTableNames();
    return res.json({ success: true, data: tables });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get table names";
    return res.status(500).json({ success: false, error: message });
  }
}
