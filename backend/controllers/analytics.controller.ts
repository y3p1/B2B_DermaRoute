import type { Request, Response } from "../http/types";

import {
  getOrdersMissingOutcomes,
  logOutcome,
  logOutcomeSchema,
  getSuccessRate,
} from "../services/analytics.service";
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

// GET /api/analytics/outcomes — list orders missing outcomes
export async function listOrdersMissingOutcomesController(
  _req: Request,
  res: Response,
) {
  try {
    const data = await getOrdersMissingOutcomes();
    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load outcomes data";
    return res.status(500).json({ success: false, error: message });
  }
}

// POST /api/analytics/outcomes — log an outcome
export async function logOutcomeController(req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const actor = await resolveStaffActor(userId);
  if (!actor) return res.status(403).json({ error: "Access denied" });

  const parsed = logOutcomeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  try {
    const created = await logOutcome(parsed.data, actor.id, actor.type);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to log outcome";
    return res.status(400).json({ error: message });
  }
}

// GET /api/analytics/success-rate?woundType=DFU&manufacturerId=xxx
export async function successRateController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const woundType = url.searchParams.get("woundType");

    if (!woundType) {
      return res
        .status(400)
        .json({ error: "woundType query parameter is required" });
    }

    const manufacturerId =
      url.searchParams.get("manufacturerId") ?? undefined;

    const data = await getSuccessRate(woundType, manufacturerId);
    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compute success rate";
    return res.status(500).json({ success: false, error: message });
  }
}
