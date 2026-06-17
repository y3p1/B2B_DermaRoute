import { pgTable, uuid, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { providerAcct } from "./provider";

export const practiceTracks = pgTable(
  "practice_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").references(() => providerAcct.id, {
      onDelete: "cascade",
    }),
    track: text("track").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("practice_tracks_provider_track_unique").on(t.providerId, t.track)],
);
