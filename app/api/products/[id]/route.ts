import {
  getProductController,
  updateProductController,
  deleteProductController,
} from "@/backend/controllers/products.controller";
import { corsMiddleware } from "@/backend/middlewares/cors";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { requireAuth } from "@/backend/middlewares/requireAuth";
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
      void getProductController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function PUT(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdminOrClinicStaff],
    handler: (req, res, next) => {
      void updateProductController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function DELETE(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdminOrClinicStaff],
    handler: (req, res, next) => {
      void deleteProductController(req, res)
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
