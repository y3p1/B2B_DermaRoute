import {
  listSystemSettingsController,
  upsertSystemSettingController,
} from "../../../backend/controllers/systemSettings.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { requireAdmin } from "../../../backend/middlewares/requireAdmin";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 60 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAdmin],
    handler: (req, res, next) => {
      void listSystemSettingsController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function PUT(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAdmin],
    handler: (req, res, next) => {
      void upsertSystemSettingController(req, res)
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
