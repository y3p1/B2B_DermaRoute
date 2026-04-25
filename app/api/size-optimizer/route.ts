import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";
import { optimizeSize } from "../../../backend/services/sizeOptimizer.service";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: async (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        const woundSizeStr = url.searchParams.get("woundSize");
        const manufacturerId = url.searchParams.get("manufacturerId") ?? undefined;

        if (!woundSizeStr) {
          return res.status(400).json({ error: "woundSize query parameter is required" });
        }

        const woundSize = parseFloat(woundSizeStr);
        if (!Number.isFinite(woundSize) || woundSize <= 0) {
          return res.status(400).json({ error: "woundSize must be a positive number" });
        }

        const data = await optimizeSize(woundSize, manufacturerId);
        return res.json({ success: true, data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to compute size recommendation";
        return res.status(500).json({ success: false, error: message });
      }
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
