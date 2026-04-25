import { corsMiddleware } from "../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../../backend/middlewares/rateLimit";
import { requireAuth } from "../../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../../backend/middlewares/requireAdmin";
import { getAllowedOrigins } from "../../../../backend/config/env";
import { runServerPipeline } from "../../../../backend/serverPipeline";
import { listAllClinicStaff } from "../../../../backend/services/clinicStaffAdmin.service";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: async (_req, res) => {
      const data = await listAllClinicStaff();
      return res.json({ success: true, data });
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
