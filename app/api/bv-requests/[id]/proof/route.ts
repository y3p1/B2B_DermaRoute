import { corsMiddleware } from "../../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../../backend/config/env";
import { runServerPipeline } from "../../../../../backend/serverPipeline";
import {
  getProviderProfileByUserId,
  updateBvRequestProof,
} from "../../../../../backend/services/bvRequests.service";
import { NextRequest } from "next/server";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: async (req, res, next) => {
      try {
        const userId = res.locals.userId as string | undefined;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const profile = await getProviderProfileByUserId(userId);
        if (!profile)
          return res.status(403).json({ error: "No provider profile found" });

        const { approvalProofUrl } = req.body as { approvalProofUrl?: string };
        if (!approvalProofUrl || typeof approvalProofUrl !== "string") {
          return res.status(400).json({ error: "Missing approvalProofUrl" });
        }

        const updated = await updateBvRequestProof(id, profile.id, approvalProofUrl);
        if (!updated) {
          return res.status(404).json({ error: "BV request not found or not owned by you" });
        }

        return res.json({ success: true, data: updated });
      } catch (err) {
        return next(err);
      }
    },
    errorHandler,
  });
}
