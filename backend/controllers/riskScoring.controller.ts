import type { Request, Response } from "../http/types";

import {
  listScoredOrders,
  getScoredOrderById,
  dismissRiskEntry,
} from "../services/riskScoring.service";

export async function listScoredOrdersController(
  _req: Request,
  res: Response,
) {
  try {
    const data = await listScoredOrders();
    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load risk queue";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function getScoredOrderController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const orderId = segments[segments.length - 1];

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const data = await getScoredOrderById(orderId);
    if (!data) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load risk detail";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function dismissRiskEntryController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const orderId = segments[segments.length - 1];

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const result = await dismissRiskEntry(orderId);
    if (!result) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({ success: true, message: "Risk entry dismissed." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to dismiss risk entry";
    return res.status(500).json({ success: false, error: message });
  }
}
