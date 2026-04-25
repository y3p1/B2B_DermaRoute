import { corsMiddleware } from "../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../backend/config/env";
import { runServerPipeline } from "../../../../backend/serverPipeline";
import {
  getProviderProfileByUserId,
  getBvRequestForProvider,
  getBvRequestById,
  updateBvRequest,
  createBvRequestSchema,
  verifyBvRequest,
} from "../../../../backend/services/bvRequests.service";
import { getAdminProfileByUserId } from "../../../../backend/services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../../../../backend/services/clinicStaffAcct.service";
import { NextRequest } from "next/server";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

export async function GET(
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

        // Check if user is admin or clinic staff
        const admin = await getAdminProfileByUserId(userId);
        const clinicStaff = admin
          ? null
          : await getClinicStaffProfileByUserId(userId);

        // If admin or clinic staff, get any BV request by ID
        if (admin || clinicStaff) {
          const found = await getBvRequestById(id);
          if (!found) return res.status(404).json({ error: "Not found" });
          return res.json({ success: true, data: found });
        }

        // Otherwise, check for provider profile
        const profile = await getProviderProfileByUserId(userId);
        if (!profile)
          return res.status(403).json({ error: "No provider profile found" });

        const found = await getBvRequestForProvider(profile.id, id);
        if (!found) return res.status(404).json({ error: "Not found" });

        return res.json({ success: true, data: found });
      } catch (err) {
        return next(err);
      }
    },
    errorHandler,
  });
}

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

        // Verify the BV request exists and belongs to this provider
        const existing = await getBvRequestForProvider(profile.id, id);
        if (!existing) return res.status(404).json({ error: "Not found" });

        // Parse and validate the request body
        const parsed = createBvRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Validation failed",
            details: parsed.error.flatten(),
          });
        }

        const updated = await updateBvRequest(profile.id, id, parsed.data);
        if (!updated)
          return res.status(500).json({ error: "Failed to update" });

        return res.json({ success: true, data: updated });
      } catch (err) {
        return next(err);
      }
    },
    errorHandler,
  });
}
