import {
  createOrderProductController,
  listOrderProductsController,
} from "../../../backend/controllers/productOrders.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: (req, res, next) => {
      void listOrderProductsController(req, res)
        .then(() => next())
        .catch(next);
    },
    errorHandler,
  });
}

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: (req, res, next) => {
      void createOrderProductController(req, res)
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
