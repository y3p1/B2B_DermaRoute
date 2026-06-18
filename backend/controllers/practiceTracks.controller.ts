import { z } from "zod";
import type { Request, Response } from "../http/types";
import { getDb } from "../services/db";
import { providerAcct } from "../../db/schema";
import { eq } from "drizzle-orm";
import {
  getTracksForAllProviders,
  getTracksForRepProviders,
  updateProviderTracks,
  type TrackKey,
} from "../services/tracks.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";
import { getAssignedProviderIds } from "../services/providerAdmin.service";
import { isDemoMode } from "../../lib/demoMode";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listProviderTracksController(
  _req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  const db = getDb();

  let providerIdFilter: string[] | null = null;

  if (userId && !isDemoMode()) {
    const admin = await getAdminProfileByUserId(userId);
    if (!admin) {
      const clinicStaff = await getClinicStaffProfileByUserId(userId);
      if (clinicStaff) {
        providerIdFilter = await getAssignedProviderIds(clinicStaff.id);
      }
    }
  }

  const allProviders = await db
    .select({
      id: providerAcct.id,
      clinicName: providerAcct.clinicName,
      npiNumber: providerAcct.npiNumber,
      email: providerAcct.email,
    })
    .from(providerAcct)
    .where(eq(providerAcct.active, true))
    .orderBy(providerAcct.clinicName);

  const providers =
    providerIdFilter !== null
      ? allProviders.filter((p) => providerIdFilter!.includes(p.id))
      : allProviders;

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

export async function updateProviderTracksController(
  req: Request,
  res: Response,
) {
  const providerId = getLastPathSegment(req.url);
  if (!providerId) return res.status(400).json({ error: "providerId required" });

  const parsed = updateTracksSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const userId = res.locals.userId as string | undefined;

  // Clinic staff can only update tracks for their assigned providers
  if (userId && !isDemoMode()) {
    const admin = await getAdminProfileByUserId(userId);
    if (!admin) {
      const clinicStaff = await getClinicStaffProfileByUserId(userId);
      if (clinicStaff) {
        const assignedIds = await getAssignedProviderIds(clinicStaff.id);
        if (!assignedIds.includes(providerId)) {
          return res.status(403).json({ error: "Provider not assigned to your territory" });
        }
      }
    }
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
