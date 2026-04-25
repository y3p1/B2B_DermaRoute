import { adminAccountCreateController } from "../../../backend/controllers/adminAccountCreate.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { requireAuth } from "../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../backend/middlewares/requireAdmin";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
const createLimit = rateLimit({ windowMs: 60_000, max: 30 });

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, createLimit, requireAuth, requireAdmin],
    handler: adminAccountCreateController,
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
