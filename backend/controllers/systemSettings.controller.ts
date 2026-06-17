import { z } from "zod";
import type { Request, Response } from "../http/types";
import { getAllSettings, upsertSetting } from "../services/systemSettings.service";

export async function listSystemSettingsController(_req: Request, res: Response) {
  const settings = await getAllSettings();
  return res.json({ success: true, data: settings });
}

const upsertSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function upsertSystemSettingController(req: Request, res: Response) {
  const adminId = res.locals.adminAcctId as string | undefined;
  if (!adminId) return res.status(403).json({ error: "Admin only" });

  const parsed = upsertSettingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  await upsertSetting(parsed.data.key, parsed.data.value, adminId);
  return res.json({ success: true });
}
