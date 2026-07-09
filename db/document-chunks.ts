import { customType, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 3072})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number);
  },
});

// RLS policies: supabase/rls/document_chunks.sql (finding #12)
export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 3072 }).notNull(),
  sourceFile: text("source_file").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
