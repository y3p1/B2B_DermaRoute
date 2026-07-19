import { date, integer, pgTable } from "drizzle-orm/pg-core";

// Global, durable daily counter of Gemini API calls (embeddings + generation),
// shared across all serverless instances via Postgres. This is the authoritative
// cost backstop for the policy assistant — the per-IP rateLimit middleware is
// in-memory/per-instance and bypassed in demo mode, so it cannot bound spend.
// See backend/services/llmBudget.ts. RLS: supabase/rls/llm_usage_daily.sql
export const llmUsageDaily = pgTable("llm_usage_daily", {
  usageDate: date("usage_date").primaryKey(),
  callCount: integer("call_count").notNull().default(0),
});
