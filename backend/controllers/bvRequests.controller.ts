import type { Request, Response } from "../http/types";

import {
  createBvRequest,
  createBvRequestSchema,
  getProviderProfileByUserId,
  listBvRequestsForProvider,
  listAllBvRequests,
} from "../services/bvRequests.service";
import {
  getAdminProfileByUserId,
  getAllAdminEmails,
} from "../services/adminAcct.service";
import {
  getClinicStaffProfileByUserId,
  getAllClinicStaffEmails,
} from "../services/clinicStaffAcct.service";
import { sendBvRequestNotification } from "../services/sendgrid.service";

export async function listBvRequestsController(_req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if user is admin or clinic staff
  const admin = await getAdminProfileByUserId(userId);
  const clinicStaff = admin
    ? null
    : await getClinicStaffProfileByUserId(userId);

  // If admin or clinic staff, return all BV requests
  if (admin || clinicStaff) {
    const rows = await listAllBvRequests();
    return res.json({ success: true, data: rows });
  }

  // Otherwise, check for provider profile
  const profile = await getProviderProfileByUserId(userId);
  if (!profile) {
    return res.status(403).json({ error: "No provider profile found" });
  }

  const rows = await listBvRequestsForProvider(profile.id);
  return res.json({ success: true, data: rows });
}

export async function createBvRequestController(req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = await getProviderProfileByUserId(userId);
  if (!profile) {
    return res.status(403).json({ error: "No provider profile found" });
  }

  const parsed = createBvRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const created = await createBvRequest(profile.id, parsed.data);

  // Send email notifications to admins and clinic staff
  // Run asynchronously to not block the response
  (async () => {
    try {
      // Get all admin and clinic staff email addresses
      const [adminEmails, clinicStaffEmails] = await Promise.all([
        getAllAdminEmails(),
        getAllClinicStaffEmails(),
      ]);

      // Combine all recipients (automatically removes duplicates if any)
      // Include ADMIN_NOTIFICATION_EMAIL env var as a guaranteed fallback
      const fallbackEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      const allRecipients = Array.from(
        new Set([
          ...adminEmails,
          ...clinicStaffEmails,
          ...(fallbackEmail ? [fallbackEmail] : []),
        ]),
      );

      if (allRecipients.length > 0) {
        await sendBvRequestNotification(allRecipients, {
          bvRequestId: created.id,
          practiceName: profile.clinicName || "Unknown Practice",
          provider: parsed.data.provider,
          insurance: parsed.data.insurance,
          woundType: parsed.data.woundType,
          woundSize: parsed.data.woundSize,
          woundLocation: parsed.data.woundLocation,
          patientInitials: parsed.data.initials,
          applicationDate: parsed.data.applicationDate,
          deliveryDate: parsed.data.deliveryDate,
          createdAt:
            created.createdAt?.toISOString() || new Date().toISOString(),
        });
        console.log(
          `BV notification successfully sent to ${allRecipients.length} recipients`,
        );
      } else {
        console.warn(
          "No admin or clinic staff emails found for BV notification",
        );
      }
    } catch (emailError) {
      // Log error but don't fail the request
      console.error("Failed to send BV notification email:", emailError);
    }
  })();

  return res.status(201).json({ success: true, data: created });
}
