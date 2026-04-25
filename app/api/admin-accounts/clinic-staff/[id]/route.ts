import { z } from "zod";

import { corsMiddleware } from "../../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../../../backend/middlewares/rateLimit";
import { requireAuth } from "../../../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../../../backend/middlewares/requireAdmin";
import { getAllowedOrigins } from "../../../../../backend/config/env";
import { runServerPipeline } from "../../../../../backend/serverPipeline";
import { updateClinicStaffActive } from "../../../../../backend/services/clinicStaffAdmin.service";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

const patchSchema = z.object({
  active: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdmin],
    handler: async (req, res) => {
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten(),
        });
      }

      const updated = await updateClinicStaffActive(id, parsed.data.active);
      if (!updated) {
        return res.status(404).json({ error: "Clinic staff account not found" });
      }

      return res.json({ success: true, data: updated });
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
