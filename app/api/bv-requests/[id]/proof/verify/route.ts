import { corsMiddleware } from "@/backend/middlewares/cors";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { getAllowedOrigins } from "@/backend/config/env";
import { runServerPipeline } from "@/backend/serverPipeline";
import {
  verifyBvRequestProof,
} from "@/backend/services/bvRequests.service";
import {
  getAdminProfileByUserId,
} from "@/backend/services/adminAcct.service";
import {
  getClinicStaffProfileByUserId,
} from "@/backend/services/clinicStaffAcct.service";
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

        // Check if user is admin or clinic staff
        const [admin, clinicStaff] = await Promise.all([
          getAdminProfileByUserId(userId),
          getClinicStaffProfileByUserId(userId),
        ]);

        if (!admin && !clinicStaff) {
          return res.status(403).json({ error: "Forbidden: Admins or Clinic Staff only" });
        }

        const { status } = req.body as { status?: "verified" | "rejected" };
        if (!status || (status !== "verified" && status !== "rejected")) {
          return res.status(400).json({ error: "Invalid status. Must be 'verified' or 'rejected'." });
        }

        const verifierId = admin ? admin.id : clinicStaff!.id;

        const updated = await verifyBvRequestProof({
          id,
          status,
          verifiedBy: verifierId,
        });

        if (!updated) {
          return res.status(404).json({ error: "BV request not found" });
        }

        return res.json({ success: true, data: updated });
      } catch (err) {
        return next(err);
      }
    },
    errorHandler,
  });
}
