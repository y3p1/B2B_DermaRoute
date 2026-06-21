import { z } from "zod";
import { corsMiddleware } from "../../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../../../backend/middlewares/requireAdmin";
import { rateLimit } from "../../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../../backend/config/env";
import { runServerPipeline } from "../../../../../backend/serverPipeline";
import { updateProviderAssignedRep } from "../../../../../backend/services/providerAccounts.service";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 60 });

const patchSchema = z.object({
  assignedRepId: z.string().uuid().nullable(),
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

      await updateProviderAssignedRep(id, parsed.data.assignedRepId);
      return res.json({ success: true });
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
