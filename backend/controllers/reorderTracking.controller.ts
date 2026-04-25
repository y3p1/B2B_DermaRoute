import type { Request, Response } from "../http/types";
import { getReorderTrackingData } from "../services/reorderTracking.service";

export async function listReorderTrackingController(
  _req: Request,
  res: Response,
) {
  try {
    const result = await getReorderTrackingData();
    return res.json({ success: true, data: result.data, threshold: result.threshold });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get reorder tracking data";
    return res.status(500).json({ success: false, error: message });
  }
}
