import type { Request, Response } from "../http/types";

import { z } from "zod";

import {
  getBaaProviderForAdmin,
  listBaaProvidersForAdmin,
  listBaaProvidersForProvider,
  updateBusinessAssociateSignature,
} from "../services/baaProviderAdmin.service";
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";
import { getProviderProfileByUserId } from "../services/bvRequests.service";

function getLastPathSegment(pathname: string): string | null {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] ?? null;
}

export async function listBaaProvidersAdminController(
  _req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if user is admin or clinic staff
  const admin = await getAdminProfileByUserId(userId);
  const clinicStaff = admin
    ? null
    : await getClinicStaffProfileByUserId(userId);

  if (admin || clinicStaff) {
    const rows = await listBaaProvidersForAdmin();
    return res.json({ success: true, data: rows });
  }

  // Allow providers to view their own BAA agreements
  const provider = await getProviderProfileByUserId(userId);
  if (provider) {
    const rows = await listBaaProvidersForProvider(provider.id);
    return res.json({ success: true, data: rows });
  }

  return res.status(403).json({ error: "Access denied" });
}

export async function getBaaProviderAdminController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "Missing id" });

  const userId = res.locals.userId as string | undefined;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const row = await getBaaProviderForAdmin(id);
  if (!row) return res.status(404).json({ error: "Not found" });

  // Admin/clinic-staff can view any record; provider can only view their own
  const admin = await getAdminProfileByUserId(userId);
  if (!admin) {
    const clinicStaff = await getClinicStaffProfileByUserId(userId);
    if (!clinicStaff) {
      const provider = await getProviderProfileByUserId(userId);
      if (!provider || provider.id !== row.providerAcctId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
  }

  return res.json({ success: true, data: row });
}

const updateSchema = z.object({
  businessAssociateName: z.string().trim().min(1, "Name is required"),
  businessAssociateTitle: z.string().trim().min(1, "Title is required"),
  businessAssociateDate: z.string().trim().min(1, "Date is required"),
  businessAssociateSignature: z.string().trim().min(1, "Signature is required"),
});

export async function updateBaaProviderAdminController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "Missing id" });

  const approverUserId = res.locals.approverUserId as string | undefined;
  const approverRole = res.locals.approverRole as
    | "admin"
    | "clinic_staff"
    | undefined;
  const adminAcctId = res.locals.adminAcctId as string | undefined;
  if (!approverUserId || !approverRole)
    return res.status(403).json({ error: "Access denied" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated = await updateBusinessAssociateSignature({
    baaId: id,
    approverUserId,
    approverRole,
    adminAcctId: approverRole === "admin" ? adminAcctId : undefined,
    businessAssociateName: parsed.data.businessAssociateName,
    businessAssociateTitle: parsed.data.businessAssociateTitle,
    businessAssociateDate: parsed.data.businessAssociateDate,
    businessAssociateSignatureDataUrl: parsed.data.businessAssociateSignature,
  });

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: updated });
}
