import type { Request, Response } from "../http/types";
import { listWoundSizes } from "../services/woundSizes.service";

export async function listWoundSizesController(_req: Request, res: Response) {
  try {
    const woundSizes = await listWoundSizes();
    return res.json({ success: true, data: woundSizes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list wound sizes";
    return res.status(500).json({ success: false, error: message });
  }
}
