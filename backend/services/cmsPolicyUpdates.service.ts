import { eq, desc, sql, and } from "drizzle-orm";
import { getDb } from "./db";
import { cmsFeedSources, cmsPolicyUpdates } from "../../db/cms-policy-updates";
import { XMLParser } from "fast-xml-parser";

// Wound-care keywords for filtering RSS items
const WOUND_CARE_KEYWORDS = [
  "skin substitute",
  "graft",
  "wound care",
  "wound management",
  "PRP",
  "Q-code",
  "Q4",
  "cellular tissue",
  "dermal",
  "bioengineered",
  "amniotic",
  "placental",
  "chronic wound",
  "diabetic foot ulcer",
  "venous leg ulcer",
  "pressure ulcer",
  "debridement",
  "negative pressure",
  "hyperbaric",
  "tissue product",
  "CTP",
  "LCD",
  "local coverage determination",
];

// ─── CMS Feed Sources CRUD ─────────────────────────────────────────────────

export type CmsFeedSourceRow = {
  id: string;
  name: string;
  feedUrl: string;
  region: string | null;
  active: boolean;
  lastFetchedAt: Date | null;
  createdAt: Date | null;
};

export async function listFeedSources(): Promise<CmsFeedSourceRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(cmsFeedSources)
    .orderBy(desc(cmsFeedSources.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    feedUrl: r.feedUrl,
    region: r.region,
    active: r.active,
    lastFetchedAt: r.lastFetchedAt,
    createdAt: r.createdAt,
  }));
}

export async function createFeedSource(data: {
  name: string;
  feedUrl: string;
  region?: string;
}) {
  const db = getDb();
  const [source] = await db
    .insert(cmsFeedSources)
    .values({
      name: data.name,
      feedUrl: data.feedUrl,
      region: data.region || null,
    })
    .returning();
  return source;
}

export async function deleteFeedSource(id: string) {
  const db = getDb();
  await db.delete(cmsFeedSources).where(eq(cmsFeedSources.id, id));
}

// ─── CMS Policy Updates CRUD ───────────────────────────────────────────────

export type CmsPolicyUpdateRow = {
  id: string;
  feedSourceId: string | null;
  title: string;
  sourceUrl: string;
  sourceName: string | null;
  publishedAt: Date | null;
  summary: string | null;
  keywords: unknown;
  impactLevel: string;
  isRead: boolean;
  readBy: string | null;
  notes: string | null;
  createdAt: Date | null;
};

export async function listCmsPolicyUpdates(filters?: {
  impactLevel?: string;
  isRead?: boolean;
}): Promise<CmsPolicyUpdateRow[]> {
  const db = getDb();

  const conditions = [];
  if (filters?.impactLevel) {
    conditions.push(eq(cmsPolicyUpdates.impactLevel, filters.impactLevel));
  }
  if (filters?.isRead !== undefined) {
    conditions.push(eq(cmsPolicyUpdates.isRead, filters.isRead));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(cmsPolicyUpdates)
    .where(where)
    .orderBy(desc(cmsPolicyUpdates.publishedAt));

  return rows.map((r) => ({
    id: r.id,
    feedSourceId: r.feedSourceId,
    title: r.title,
    sourceUrl: r.sourceUrl,
    sourceName: r.sourceName,
    publishedAt: r.publishedAt,
    summary: r.summary,
    keywords: r.keywords,
    impactLevel: r.impactLevel,
    isRead: r.isRead,
    readBy: r.readBy,
    notes: r.notes,
    createdAt: r.createdAt,
  }));
}

export async function getUnreadCount(): Promise<number> {
  const db = getDb();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cmsPolicyUpdates)
    .where(eq(cmsPolicyUpdates.isRead, false));
  return result?.count ?? 0;
}

export async function createCmsPolicyUpdate(data: {
  feedSourceId?: string;
  title: string;
  sourceUrl: string;
  sourceName?: string;
  publishedAt?: string;
  summary?: string;
  keywords?: string[];
  impactLevel?: string;
}) {
  const db = getDb();
  const [update] = await db
    .insert(cmsPolicyUpdates)
    .values({
      feedSourceId: data.feedSourceId || null,
      title: data.title,
      sourceUrl: data.sourceUrl,
      sourceName: data.sourceName || null,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      summary: data.summary || null,
      keywords: data.keywords ? JSON.stringify(data.keywords) : null,
      impactLevel: data.impactLevel || "medium",
    })
    .returning();
  return update;
}

export async function markCmsUpdateAsRead(id: string, readByUserId: string) {
  const db = getDb();
  const [updated] = await db
    .update(cmsPolicyUpdates)
    .set({
      isRead: true,
      readBy: readByUserId,
      updatedAt: new Date(),
    })
    .where(eq(cmsPolicyUpdates.id, id))
    .returning();
  return updated;
}

export async function updateCmsUpdateNotes(id: string, notes: string) {
  const db = getDb();
  const [updated] = await db
    .update(cmsPolicyUpdates)
    .set({ notes, updatedAt: new Date() })
    .where(eq(cmsPolicyUpdates.id, id))
    .returning();
  return updated;
}

export async function deleteCmsPolicyUpdate(id: string) {
  const db = getDb();
  await db.delete(cmsPolicyUpdates).where(eq(cmsPolicyUpdates.id, id));
}

// ─── RSS Feed Sync ──────────────────────────────────────────────────────────

type RssItem = {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  "dc:date"?: string;
};

function matchesWoundCareKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return WOUND_CARE_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
}

function classifyImpact(title: string, description: string): "high" | "medium" | "low" {
  const combined = `${title} ${description}`.toLowerCase();
  const highImpactTerms = [
    "lcd", "local coverage determination", "final", "effective",
    "skin substitute", "q4", "q-code", "CTP",
  ];
  const mediumImpactTerms = [
    "proposed", "draft", "wound", "graft", "dermal",
  ];

  if (highImpactTerms.some((t) => combined.includes(t))) return "high";
  if (mediumImpactTerms.some((t) => combined.includes(t))) return "medium";
  return "low";
}

export async function syncRssFeeds(): Promise<{
  sourcesChecked: number;
  newItems: number;
  errors: string[];
}> {
  const db = getDb();
  let sourcesChecked = 0;
  let newItems = 0;
  const errors: string[] = [];

  const sources = await db
    .select()
    .from(cmsFeedSources)
    .where(eq(cmsFeedSources.active, true));

  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === "item" || name === "entry",
  });

  for (const source of sources) {
    sourcesChecked++;
    try {
      const response = await fetch(source.feedUrl, {
        headers: { "User-Agent": "DermaRoute-CMSMonitor/1.0" },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        errors.push(`${source.name}: HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const parsed = parser.parse(xml);

      // Handle RSS 2.0 and Atom feed formats
      const items: RssItem[] =
        parsed?.rss?.channel?.item ??
        parsed?.feed?.entry ??
        [];

      for (const item of items) {
        const title = item.title ?? "";
        const link = item.link ?? "";
        const description = item.description ?? "";
        const pubDate = item.pubDate ?? item["dc:date"] ?? "";

        if (!title || !link) continue;

        // Check if this URL already exists (dedup)
        const existing = await db
          .select({ id: cmsPolicyUpdates.id })
          .from(cmsPolicyUpdates)
          .where(eq(cmsPolicyUpdates.sourceUrl, link))
          .limit(1);

        if (existing.length > 0) continue;

        // Check keyword match
        const matched = matchesWoundCareKeywords(`${title} ${description}`);
        if (matched.length === 0) continue;

        const impact = classifyImpact(title, description);

        await db.insert(cmsPolicyUpdates).values({
          feedSourceId: source.id,
          title,
          sourceUrl: link,
          sourceName: source.name,
          publishedAt: pubDate ? new Date(pubDate) : null,
          summary: description.slice(0, 500) || null,
          keywords: matched,
          impactLevel: impact,
        });

        newItems++;
      }

      // Update last fetched timestamp
      await db
        .update(cmsFeedSources)
        .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
        .where(eq(cmsFeedSources.id, source.id));
    } catch (err) {
      errors.push(
        `${source.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return { sourcesChecked, newItems, errors };
}
