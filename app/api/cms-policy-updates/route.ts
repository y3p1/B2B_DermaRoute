import {
  listCmsPolicyUpdatesController,
  createCmsPolicyUpdateController,
  patchCmsPolicyUpdateController,
  deleteCmsPolicyUpdateController,
  listFeedSourcesController,
  createFeedSourceController,
  deleteFeedSourceController,
} from "@/backend/controllers/cmsPolicyUpdates.controller";
import { corsMiddleware } from "@/backend/middlewares/cors";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { requireAdmin } from "@/backend/middlewares/requireAdmin";
import { requireAdminOrClinicStaff } from "@/backend/middlewares/requireAdminOrClinicStaff";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { getAllowedOrigins } from "@/backend/config/env";
import { runServerPipeline } from "@/backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isFeedSources = url.searchParams.get("type") === "feed-sources";

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdminOrClinicStaff],
    handler: (req, res, next) => {
      const controller = isFeedSources
        ? listFeedSourcesController
        : listCmsPolicyUpdatesController;
      void controller(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const isFeedSource = url.searchParams.get("type") === "feed-source";

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      const controller = isFeedSource
        ? createFeedSourceController
        : createCmsPolicyUpdateController;
      void controller(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function PATCH(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      void patchCmsPolicyUpdateController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const isFeedSource = url.searchParams.get("type") === "feed-source";

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      const controller = isFeedSource
        ? deleteFeedSourceController
        : deleteCmsPolicyUpdateController;
      void controller(req, res)
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
