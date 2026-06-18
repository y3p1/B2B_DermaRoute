import type { Request, Response } from "../http/types";
import { getReorderTrackingData } from "../services/reorderTracking.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";
import { isDemoMode } from "../../lib/demoMode";

export async function listReorderTrackingController(
  _req: Request,
  res: Response,
) {
  try {
    const userId = res.locals.userId as string | undefined;
    let repId: string | undefined;

    if (userId && !isDemoMode()) {
      const admin = await getAdminProfileByUserId(userId);
      if (!admin) {
        const clinicStaff = await getClinicStaffProfileByUserId(userId);
        if (clinicStaff) {
          repId = clinicStaff.id;
        }
      }
    }

    const result = await getReorderTrackingData(repId);
    return res.json({ success: true, data: result.data, threshold: result.threshold });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get reorder tracking data";
    return res.status(500).json({ success: false, error: message });
  }
}
