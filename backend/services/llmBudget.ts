import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { HttpError } from "../utils/httpError";
import { getGeminiDailyCallBudget } from "../config/env";

/**
 * Global, durable daily cap on Gemini API calls (embeddings + generation),
 * shared across all serverless instances via Postgres. This is the authoritative
 * cost backstop for the policy assistant: the per-IP `rateLimit` middleware is
 * in-memory / per-instance and is skipped in demo mode, so it cannot bound spend
 * on its own.
 *
 * Reserves `units` atomically BEFORE the calls run. If the day's running total
 * exceeds the configured budget, throws HttpError(429) and the calls are not made.
 * Fail-closed: if the counter cannot be read/written, the exception propagates and
 * the request is refused rather than billed. Set GEMINI_DAILY_CALL_BUDGET<=0 to
 * disable the cap.
 */
export async function assertLlmBudget(units: number): Promise<void> {
  const budget = getGeminiDailyCallBudget();
  if (budget <= 0) return; // cap disabled

  const db = getDb();
  // Single atomic statement: bucket by the DB server's CURRENT_DATE so all
  // instances share one counter per calendar day, and return the new total.
  const rows = (await db.execute(
    sql`INSERT INTO llm_usage_daily (usage_date, call_count)
        VALUES (CURRENT_DATE, ${units})
        ON CONFLICT (usage_date)
        DO UPDATE SET call_count = llm_usage_daily.call_count + ${units}
        RETURNING call_count`,
  )) as Array<{ call_count: number | string }>;

  const total = Number(rows[0]?.call_count ?? 0);
  if (total > budget) {
    throw new HttpError(
      429,
      "Daily AI usage limit reached. Please try again tomorrow.",
      { code: "LLM_DAILY_BUDGET_EXCEEDED" },
    );
  }
}
