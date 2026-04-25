import {
  listCoveragePlansController,
  createCoveragePlanController,
  updateCoveragePlanController,
  deleteCoveragePlanController,
  addPolicyMonitorController,
} from "@/backend/controllers/coveragePlans.controller";
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
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdminOrClinicStaff],
    handler: (req, res, next) => {
      void listCoveragePlansController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const isMonitor = url.searchParams.get("type") === "monitor";

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: (req, res, next) => {
      const controller = isMonitor
        ? addPolicyMonitorController
        : createCoveragePlanController;
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
      void updateCoveragePlanController(req, res)
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
      void deleteCoveragePlanController(req, res)
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
