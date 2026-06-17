import { z } from "zod";
import type { Request, Response } from "../http/types";
import { getDb } from "../services/db";
import { providerAcct } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  getTracksForAllProviders,
  updateProviderTracks,
  type TrackKey,
} from "../services/tracks.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listProviderTracksController(_req: Request, res: Response) {
  const db = getDb();

  const providers = await db
    .select({
      id: providerAcct.id,
      clinicName: providerAcct.clinicName,
      npiNumber: providerAcct.npiNumber,
      email: providerAcct.email,
    })
    .from(providerAcct)
    .where(eq(providerAcct.active, true))
    .orderBy(providerAcct.clinicName);

  const tracksMap = await getTracksForAllProviders();

  const data = providers.map((p) => ({
    ...p,
    enabledTracks: tracksMap[p.id] ?? [],
  }));

  return res.json({ success: true, data });
}

const updateTracksSchema = z.object({
  tracks: z.array(z.enum(["wound_care", "lymphedema", "ocular"])),
});

export async function updateProviderTracksController(req: Request, res: Response) {
  const providerId = getLastPathSegment(req.url);
  if (!providerId) return res.status(400).json({ error: "providerId required" });

  const parsed = updateTracksSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const db = getDb();
  const provider = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.id, providerId))
    .limit(1);

  if (!provider[0]) return res.status(404).json({ error: "Provider not found" });

  await updateProviderTracks(providerId, parsed.data.tracks as TrackKey[]);

  return res.json({ success: true });
}
