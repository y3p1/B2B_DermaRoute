import { z } from "zod";
import type { Request, Response } from "../http/types";
import {
  createOcularOrder,
  createOcularOrderSchema,
  getOcularOrder,
  getOcularOrders,
  updateOcularOrderStatus,
} from "../services/ocular.service";
import { getProviderProfileByUserId } from "../services/bvRequests.service";
import { getAssignedProviderIds, isProviderAssignedToRep } from "../services/providerAdmin.service";
import { getClinicStaffProfileByUserId } from "../services/clinicStaffAcct.service";
import { isDemoMode } from "../../lib/demoMode";
import { getSetting } from "../services/systemSettings.service";
import { sendEmail } from "../services/sendgrid.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listOcularOrdersController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const role = res.locals.adminRole as string | undefined;

  if (role === "admin") {
    const orders = await getOcularOrders();
    return res.json({ success: true, data: orders });
  }

  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (!clinicStaff) return res.status(403).json({ error: "Forbidden" });

  if (!isDemoMode()) {
    const providerIds = await getAssignedProviderIds(clinicStaff.id);
    const orders = await getOcularOrders({ providerIds });
    return res.json({ success: true, data: orders });
  }

  const orders = await getOcularOrders();
  return res.json({ success: true, data: orders });
}

export async function createOcularOrderController(req: Request, res: Response) {
  const userId = res.locals.userId as string;

  const provider = await getProviderProfileByUserId(userId);
  if (!provider) return res.status(403).json({ error: "Provider only" });

  const parsed = createOcularOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const id = await createOcularOrder(parsed.data, provider.id, userId);

  let submissionEmail = "shawn.druzali04@gmail.com";
  if (!isDemoMode()) {
    const configured = await getSetting("ocular_submission_email");
    if (configured) submissionEmail = configured;
  }

  const patient = parsed.data.patient;
  try {
    await sendEmail({
      to: submissionEmail,
      subject: `VisiDisc Order — ${patient.firstName} ${patient.lastName} — ${provider.clinicName}`,
      text: [
        `New VisiDisc ocular order submitted by ${provider.clinicName}`,
        `Patient: ${patient.firstName} ${patient.lastName} (DOB: ${patient.dob})`,
        `Eye: ${parsed.data.eye}`,
        `Product: VisiDisc ${parsed.data.productVariant} ${parsed.data.sizeMm}mm (${parsed.data.sku})`,
        `Quantity: ${parsed.data.quantity}`,
        `Diagnosis: ${parsed.data.primaryDiagnosis}${parsed.data.secondaryDiagnosis ? `, ${parsed.data.secondaryDiagnosis}` : ""}`,
        `Order ID: ${id}`,
      ].join("\n"),
    });
    await updateOcularOrderStatus(id, "pending", submissionEmail);
  } catch {
    // Email failure is non-fatal
  }

  return res.status(201).json({ success: true, data: { id } });
}

export async function getOcularOrderController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const role = res.locals.adminRole as string | undefined;
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const order = await getOcularOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  if (role !== "admin") {
    const clinicStaff = await getClinicStaffProfileByUserId(userId);
    if (!clinicStaff) return res.status(403).json({ error: "Forbidden" });
    if (!isDemoMode() && order.providerId) {
      const allowed = await isProviderAssignedToRep(order.providerId, clinicStaff.id);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }
  }

  return res.json({ success: true, data: order });
}

const updateStatusSchema = z.object({
  status: z.enum(["pending", "approved", "shipped", "completed", "denied", "cancelled"]),
});

export async function updateOcularOrderStatusController(req: Request, res: Response) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const order = await getOcularOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  await updateOcularOrderStatus(id, parsed.data.status);
  return res.json({ success: true });
}
