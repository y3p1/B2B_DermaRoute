import { runServerPipeline } from "@/backend/serverPipeline";
import { corsMiddleware } from "@/backend/middlewares/cors";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { getAllowedOrigins } from "@/backend/config/env";
import { listWoundSizesController } from "@/backend/controllers/woundSizes.controller";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: (req, res, next) => {
      void listWoundSizesController(req, res)
        .then(() => next())
        .catch(next);
    },
    // Optionally add errorHandler if you want consistent error responses
  });
}
