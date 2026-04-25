import type { Request, Response } from "../http/types";

import { getProviderProfileByUserId } from "../services/bvRequests.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";
import {
  updateProviderProfile,
  updateProviderProfileSchema,
} from "../services/providerAcct.service";

export async function meController(_req: Request, res: Response) {
  const user = res.locals.user as
    | {
      id: string;
      email?: string;
      phone?: string;
      user_metadata?: Record<string, unknown>;
    }
    | undefined;

  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const provider = await getProviderProfileByUserId(user.id);
  const admin = provider ? null : await getAdminProfileByUserId(user.id);
  const clinicStaff =
    provider || admin ? null : await getClinicStaffProfileByUserId(user.id);

  if (!provider && !admin && !clinicStaff) {
    return res
      .status(403)
      .json({ error: "No provider or admin profile found" });
  }

  const accountType: "provider" | "admin" = provider || clinicStaff
    ? "provider"
    : "admin";
  const role = (provider?.role ?? admin?.role ?? "clinic_staff") as string;

  const adminLike = admin
    ? admin
    : clinicStaff
      ? {
        ...clinicStaff,
        role: "clinic_staff",
      }
      : null;

  return res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        user_metadata: user.user_metadata ?? null,
      },
      accountType,
      role,
      provider,
      admin: adminLike,
    },
  });
}

export async function updateMeProviderController(req: Request, res: Response) {
  const user = res.locals.user as
    | { id: string }
    | undefined;

  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verify this user is a provider
  const provider = await getProviderProfileByUserId(user.id);
  if (!provider) {
    return res.status(403).json({ error: "Only providers can update their profile" });
  }

  const body = req.body;
  const parsed = updateProviderProfileSchema.safeParse(body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated = await updateProviderProfile(user.id, parsed.data);
  if (!updated) {
    return res.status(500).json({ error: "Failed to update profile" });
  }

  return res.json({ success: true, data: updated });
}
