import type { Request, Response } from "../http/types";
import {
  listCoveragePlans,
  createCoveragePlan,
  updateCoveragePlan,
  deleteCoveragePlan,
  addPolicyMonitor,
  deletePolicyMonitor,
  checkPolicyUrl,
} from "../services/coveragePlans.service";

export async function listCoveragePlansController(_req: Request, res: Response) {
  try {
    const plans = await listCoveragePlans();
    return res.json({ success: true, data: plans });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list coverage plans";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createCoveragePlanController(req: Request, res: Response) {
  try {
    const body = req.body as {
      insuranceId?: string;
      planName: string;
      planType: string;
      coveredProducts?: unknown;
      policyDocUrl?: string;
      effectiveDate?: string;
      expirationDate?: string;
      notes?: string;
      monitorUrl?: string;
    };

    if (!body.planName || !body.planType) {
      return res.status(400).json({ error: "planName and planType are required" });
    }

    const plan = await createCoveragePlan(body);
    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create coverage plan";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function updateCoveragePlanController(req: Request, res: Response) {
  try {
    const body = req.body as {
      id: string;
      insuranceId?: string;
      planName?: string;
      planType?: string;
      coveredProducts?: unknown;
      policyDocUrl?: string;
      effectiveDate?: string;
      expirationDate?: string;
      notes?: string;
      active?: boolean;
    };

    if (!body.id) {
      return res.status(400).json({ error: "id is required" });
    }

    const updated = await updateCoveragePlan(body.id, body);
    return res.json({ success: true, data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update coverage plan";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteCoveragePlanController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    await deleteCoveragePlan(id);
    return res.json({ success: true, message: "Coverage plan deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete coverage plan";
    return res.status(500).json({ success: false, error: message });
  }
}

// ─── Policy Monitor endpoints ───────────────────────────────────────────────

export async function addPolicyMonitorController(req: Request, res: Response) {
  try {
    const body = req.body as { coveragePlanId: string; monitorUrl: string };
    if (!body.coveragePlanId || !body.monitorUrl) {
      return res.status(400).json({ error: "coveragePlanId and monitorUrl are required" });
    }
    const monitor = await addPolicyMonitor(body.coveragePlanId, body.monitorUrl);
    return res.status(201).json({ success: true, data: monitor });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add policy monitor";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deletePolicyMonitorController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }
    await deletePolicyMonitor(id);
    return res.json({ success: true, message: "Policy monitor deleted" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete policy monitor";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function checkPolicyUrlController(req: Request, res: Response) {
  try {
    const body = req.body as { monitorId: string };
    if (!body.monitorId) {
      return res.status(400).json({ error: "monitorId is required" });
    }

    const result = await checkPolicyUrl(body.monitorId);
    return res.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check policy URL";
    return res.status(500).json({ success: false, error: message });
  }
}
