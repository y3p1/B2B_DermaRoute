import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { providerAcct } from "../../db/schema";
import { getEnabledTracks, type TrackKey } from "./tracks.service";
import type { DemoRole } from "../../lib/demoMode";

/**
 * Demo provider email → demo role mapping.
 * Used to resolve DB-stored practice tracks for demo provider accounts.
 */
const DEMO_PROVIDER_EMAILS: Record<string, DemoRole> = {
  "demo-provider@dermaroute-demo.example.com": "provider",
  "demo-ocular@dermaroute-demo.example.com": "provider_ocular",
  "demo-wound2@dermaroute-demo.example.com": "provider_wound2",
};

/**
 * Look up the real DB practice tracks for a demo provider by email.
 * Returns null if the provider_acct row doesn't exist in the DB
 * (e.g. demo data hasn't been seeded yet).
 */
export async function getDemoProviderTracks(
  email: string,
): Promise<TrackKey[] | null> {
  const db = getDb();

  const rows = await db
    .select({ id: providerAcct.id })
    .from(providerAcct)
    .where(eq(providerAcct.email, email))
    .limit(1);

  if (!rows[0]) return null;

  return getEnabledTracks(rows[0].id);
}

/**
 * Fetch DB practice tracks for ALL demo provider accounts.
 * Returns a Record keyed by DemoRole with each provider's current tracks.
 * Used by the /api/demo-tracks endpoint for the role picker badges.
 */
export async function getAllDemoProviderTracks(): Promise<
  Record<string, TrackKey[]>
> {
  const db = getDb();
  const result: Record<string, TrackKey[]> = {};

  for (const [email, role] of Object.entries(DEMO_PROVIDER_EMAILS)) {
    const rows = await db
      .select({ id: providerAcct.id })
      .from(providerAcct)
      .where(eq(providerAcct.email, email))
      .limit(1);

    if (rows[0]) {
      result[role] = await getEnabledTracks(rows[0].id);
    }
  }

  return result;
}
