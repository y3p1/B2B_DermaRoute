import type { Request, Response } from "../http/types";

import {
  recordMeasurement,
  recordMeasurementSchema,
  getWoundCases,
  getMeasurementHistory,
  getAlternativeProducts,
  listApprovedBvOptions,
  deleteWoundCase,
} from "../services/healingTracker.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";

type ResolvedActor =
  | { type: "admin"; id: string }
  | { type: "clinic_staff"; id: string }
  | null;

async function resolveStaffActor(userId: string): Promise<ResolvedActor> {
  const admin = await getAdminProfileByUserId(userId);
  if (admin) return { type: "admin", id: admin.id };
  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (clinicStaff) return { type: "clinic_staff", id: clinicStaff.id };
  return null;
}

function getPathSegments(pathname: string): string[] {
  return (pathname || "").split("/").filter(Boolean);
}

export async function listWoundCasesController(_req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  const [cases, options] = await Promise.all([
    getWoundCases(),
    listApprovedBvOptions(),
  ]);

  return res.json({ success: true, data: { cases, options } });
}

export async function recordMeasurementController(
  req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  const parsed = recordMeasurementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  try {
    const created = await recordMeasurement(parsed.data, actor.id, actor.type);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record measurement";
    return res.status(400).json({ error: message });
  }
}

export async function measurementHistoryController(
  req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  // /api/healing-tracker/<bvRequestId>/history
  const segments = getPathSegments(req.url);
  const idIndex = segments.indexOf("healing-tracker");
  const bvRequestId = idIndex >= 0 ? segments[idIndex + 1] : null;
  if (!bvRequestId) {
    return res.status(400).json({ error: "BV request ID is required" });
  }

  const data = await getMeasurementHistory(bvRequestId);
  return res.json({ success: true, data });
}

export async function alternativeProductsController(
  req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  const segments = getPathSegments(req.url);
  const idIndex = segments.indexOf("healing-tracker");
  const bvRequestId = idIndex >= 0 ? segments[idIndex + 1] : null;
  if (!bvRequestId) {
    return res.status(400).json({ error: "BV request ID is required" });
  }

  const data = await getAlternativeProducts(bvRequestId);
  return res.json({ success: true, data });
}

export async function deleteWoundCaseController(
  req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  const segments = getPathSegments(req.url);
  const idIndex = segments.indexOf("healing-tracker");
  const bvRequestId = idIndex >= 0 ? segments[idIndex + 1] : null;
  if (!bvRequestId) {
    return res.status(400).json({ error: "BV request ID is required" });
  }

  try {
    const result = await deleteWoundCase(bvRequestId);
    return res.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete wound case";
    return res.status(500).json({ error: message });
  }
}
