import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// CMS Feed Sources — RSS feed URLs to poll for policy updates
export const cmsFeedSources = pgTable("cms_feed_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // e.g. "CMS.gov Coverage Updates"
  feedUrl: text("feed_url").notNull().unique(),
  region: varchar("region", { length: 128 }), // e.g. "National", "Jurisdiction H", etc.
  active: boolean("active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// CMS Policy Updates — individual policy update entries parsed from RSS feeds
export const cmsPolicyUpdates = pgTable("cms_policy_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  feedSourceId: uuid("feed_source_id").references(() => cmsFeedSources.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull().unique(), // deduplication key
  sourceName: varchar("source_name", { length: 255 }), // "CMS.gov", "Novitas Solutions", etc.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  summary: text("summary"),
  keywords: jsonb("keywords"), // array of matched wound-care keywords
  impactLevel: varchar("impact_level", { length: 16 }).notNull().default("medium"), // high | medium | low
  isRead: boolean("is_read").notNull().default(false),
  readBy: uuid("read_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
