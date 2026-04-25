import { corsMiddleware } from "../../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../../backend/config/env";
import { runServerPipeline } from "../../../../../backend/serverPipeline";
import {
  verifyBvRequest,
  getBvRequestById,
  getProviderContactByBvRequestId,
} from "../../../../../backend/services/bvRequests.service";
import { getAdminProfileByUserId } from "../../../../../backend/services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../../../../../backend/services/clinicStaffAcct.service";
import { sendBvStatusNotification } from "../../../../../backend/services/sendgrid.service";
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
        const admin = await getAdminProfileByUserId(userId);
        const clinicStaff = admin
          ? null
          : await getClinicStaffProfileByUserId(userId);

        if (!admin && !clinicStaff) {
          return res.status(403).json({
            error: "Only admin or clinic staff can verify BV requests",
          });
        }

        const body = req.body as { status?: string };
        const status = body.status;

        if (status !== "approved" && status !== "rejected") {
          return res.status(400).json({
            error: 'Invalid status. Must be "approved" or "rejected"',
          });
        }

        const verifierId = admin?.id ?? clinicStaff?.id;
        if (!verifierId) {
          return res.status(500).json({ error: "Failed to get verifier ID" });
        }

        const verifierType = admin ? "admin" : "clinic_staff";

        // Fetch full BV request details before update (for notification data)
        const bvRequest = await getBvRequestById(id);

        const updated = await verifyBvRequest({
          id,
          status,
          verifiedBy: verifierId,
          verifiedByType: verifierType,
        });

        if (!updated) {
          return res.status(404).json({ error: "BV request not found" });
        }

        // Send email + SMS notifications to the provider asynchronously (non-blocking)
        (async () => {
          try {
            const providerContact = await getProviderContactByBvRequestId(id);
            if (!providerContact) {
              console.warn(
                `⚠️ [BV Verify] No provider contact found for BV request ${id} — skipping notifications`,
              );
              return;
            }

            const notificationData = {
              bvRequestId: id,
              practiceName: bvRequest?.practice ?? providerContact.clinicName,
              patientInitials: bvRequest?.initials ?? "N/A",
              insurance: bvRequest?.insurance ?? "N/A",
              woundType: bvRequest?.woundType ?? "N/A",
              woundSize: bvRequest?.woundSize ?? "N/A",
              applicationDate: bvRequest?.applicationDate ?? "N/A",
              deliveryDate: bvRequest?.deliveryDate ?? "N/A",
              status: status as "approved" | "rejected",
            };

            // Email notification
            try {
              await sendBvStatusNotification(
                providerContact.email,
                notificationData,
              );
              console.log(
                `✅ [BV Verify] Email notification sent to provider ${providerContact.email} for BV request ${id} (status: ${status})`,
              );
            } catch (emailErr) {
              console.error(
                `❌ [BV Verify] Failed to send email notification for BV request ${id}:`,
                emailErr,
              );
            }
          } catch (err) {
            console.error(
              `❌ [BV Verify] Unexpected error in provider notification for BV request ${id}:`,
              err,
            );
          }
        })();

        return res.json({ success: true, data: updated });
      } catch (err) {
        return next(err);
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
