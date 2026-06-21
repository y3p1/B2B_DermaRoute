import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { providerAcct } from "../../db/provider";
import { practiceTracks } from "../../db/practice-tracks";

export async function listAllProviders() {
  const db = getDb();
  const [providers, tracks] = await Promise.all([
    db
      .select({
        id: providerAcct.id,
        clinicName: providerAcct.clinicName,
        email: providerAcct.email,
        accountPhone: providerAcct.accountPhone,
        npiNumber: providerAcct.npiNumber,
        clinicAddress: providerAcct.clinicAddress,
        clinicCity: providerAcct.clinicCity,
        clinicState: providerAcct.clinicState,
        active: providerAcct.active,
        assignedRepId: providerAcct.assignedRepId,
        createdAt: providerAcct.createdAt,
      })
      .from(providerAcct)
      .orderBy(providerAcct.createdAt),
    db
      .select({ providerId: practiceTracks.providerId, track: practiceTracks.track })
      .from(practiceTracks)
      .where(eq(practiceTracks.enabled, true)),
  ]);

  const trackMap = new Map<string, string[]>();
  for (const t of tracks) {
    if (!t.providerId) continue;
    const arr = trackMap.get(t.providerId) ?? [];
    arr.push(t.track);
    trackMap.set(t.providerId, arr);
  }

  return providers.map((p) => ({ ...p, enabledTracks: trackMap.get(p.id) ?? [] }));
}

export async function updateProviderAssignedRep(providerId: string, repId: string | null) {
  const db = getDb();
  await db
    .update(providerAcct)
    .set({ assignedRepId: repId, updatedAt: new Date() })
    .where(eq(providerAcct.id, providerId));
}
