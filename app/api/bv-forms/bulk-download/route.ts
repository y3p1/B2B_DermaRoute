import { getBulkDownloadUrlsController } from "@/backend/controllers/bvForms.controller";
import { corsMiddleware } from "@/backend/middlewares/cors";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { getAllowedOrigins } from "@/backend/config/env";
import { runServerPipeline } from "@/backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

/**
 * POST /api/bv-forms/bulk-download
 * Body: { ids: string[] }
 *
 * Returns signed download URLs for all requested form IDs in a single
 * DB query + one Supabase Storage batch call.
 *
 * Any authenticated user (including providers) may use this endpoint.
 */
export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: (req, res, next) => {
      void getBulkDownloadUrlsController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function OPTIONS(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors],
    handler: (_req, res) => res.status(204).end(),
    errorHandler,
  });
}
