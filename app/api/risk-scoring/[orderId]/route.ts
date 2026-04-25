import {
  getScoredOrderController,
  dismissRiskEntryController,
} from "../../../../backend/controllers/riskScoring.controller";
import { corsMiddleware } from "../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../../backend/middlewares/requireAdmin";
import { rateLimit } from "../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../backend/config/env";
import { runServerPipeline } from "../../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      void getScoredOrderController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function DELETE(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      void dismissRiskEntryController(req, res)
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
