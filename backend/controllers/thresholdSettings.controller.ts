import type { Request, Response } from "../http/types";
import {
  getSettingByKey,
  upsertSetting,
} from "../services/thresholdSettings.service";

export async function getSettingController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const key = url.searchParams.get("key");
    if (!key) {
      return res
        .status(400)
        .json({ success: false, error: "key query parameter required" });
    }
    const setting = await getSettingByKey(key);
    if (!setting) {
      return res
        .status(404)
        .json({ success: false, error: "Setting not found" });
    }
    return res.json({ success: true, data: setting });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get setting";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function updateSettingController(req: Request, res: Response) {
  try {
    const body = req.body as { key?: string; value?: string };
    if (!body?.key || body.value === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "key and value are required" });
    }
    const updatedBy = (res.locals.adminAcctId as string) ?? undefined;
    const setting = await upsertSetting(body.key, body.value, updatedBy);
    return res.json({ success: true, data: setting });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update setting";
    return res.status(500).json({ success: false, error: message });
  }
}
