import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { practiceTracks } from "../../db/schema";

const VALID_TRACKS = ["wound_care", "lymphedema", "ocular"] as const;
export type TrackKey = (typeof VALID_TRACKS)[number];

export async function getEnabledTracks(providerId: string): Promise<TrackKey[]> {
  const db = getDb();
  const rows = await db
    .select({ track: practiceTracks.track })
    .from(practiceTracks)
    .where(
      and(
        eq(practiceTracks.providerId, providerId),
        eq(practiceTracks.enabled, true),
      ),
    );
  return rows.map((r) => r.track as TrackKey);
}

export async function getTracksForAllProviders(): Promise<Record<string, TrackKey[]>> {
  const db = getDb();
  const rows = await db
    .select({ providerId: practiceTracks.providerId, track: practiceTracks.track })
    .from(practiceTracks)
    .where(eq(practiceTracks.enabled, true));

  const map: Record<string, TrackKey[]> = {};
  for (const row of rows) {
    if (!row.providerId) continue;
    if (!map[row.providerId]) map[row.providerId] = [];
    map[row.providerId].push(row.track as TrackKey);
  }
  return map;
}

export async function updateProviderTracks(
  providerId: string,
  tracks: TrackKey[],
): Promise<void> {
  const db = getDb();

  // Disable all existing tracks, then enable the specified ones
  await db
    .update(practiceTracks)
    .set({ enabled: false, updatedAt: new Date() })
    .where(eq(practiceTracks.providerId, providerId));

  if (tracks.length === 0) return;

  await db
    .insert(practiceTracks)
    .values(
      tracks.map((track) => ({
        providerId,
        track,
        enabled: true,
      })),
    )
    .onConflictDoUpdate({
      target: [practiceTracks.providerId, practiceTracks.track],
      set: { enabled: true, updatedAt: new Date() },
    });
}
