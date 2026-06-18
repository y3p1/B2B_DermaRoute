import { z } from "zod";
import type { Request, Response } from "../http/types";
import {
  createLymphedemaOrder,
  createLymphedemaOrderSchema,
  getLymphedemaOrder,
  getLymphedemaOrders,
  updateLymphedemaOrderStatus,
} from "../services/lymphedema.service";
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

export async function listLymphedemaOrdersController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const role = res.locals.adminRole as string | undefined;

  if (role === "admin") {
    const orders = await getLymphedemaOrders();
    return res.json({ success: true, data: orders });
  }

  // clinic_staff / rep
  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (!clinicStaff) return res.status(403).json({ error: "Forbidden" });

  if (!isDemoMode()) {
    const providerIds = await getAssignedProviderIds(clinicStaff.id);
    const orders = await getLymphedemaOrders({ providerIds });
    return res.json({ success: true, data: orders });
  }

  const orders = await getLymphedemaOrders();
  return res.json({ success: true, data: orders });
}

export async function createLymphedemaOrderController(req: Request, res: Response) {
  const userId = res.locals.userId as string;

  const provider = await getProviderProfileByUserId(userId);
  if (!provider) return res.status(403).json({ error: "Provider only" });

  const parsed = createLymphedemaOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const id = await createLymphedemaOrder(parsed.data, provider.id, userId);

  // Determine submission email
  let submissionEmail = "Lb@centralpalmsmedical.com";
  if (isDemoMode()) {
    submissionEmail = "shawn.druzali04@gmail.com";
  } else {
    const configured = await getSetting("lymphedema_submission_email");
    if (configured) submissionEmail = configured;
  }

  // Send email notification
  const patient = parsed.data.patient as { firstName: string; lastName: string };
  try {
    await sendEmail({
      to: submissionEmail,
      subject: `Lymphedema Order — ${patient.firstName} ${patient.lastName} — ${provider.clinicName}`,
      text: [
        `New lymphedema order submitted by ${provider.clinicName}`,
        `Patient: ${patient.firstName} ${patient.lastName}`,
        `Insurance: ${parsed.data.insurance}`,
        `Device: ${parsed.data.device ?? "Not specified"}`,
        `Garment type: ${parsed.data.garmentType ?? "None"}`,
        `Compression level: ${parsed.data.compressionLevel ?? "Not specified"}`,
        `Quantity: ${parsed.data.quantity ?? "Not specified"}`,
        `Order ID: ${id}`,
      ].join("\n"),
    });
    await updateLymphedemaOrderStatus(id, "pending", submissionEmail);
  } catch {
    // Email failure is non-fatal — order is still created
  }

  return res.status(201).json({ success: true, data: { id } });
}

export async function getLymphedemaOrderController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const role = res.locals.adminRole as string | undefined;
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const order = await getLymphedemaOrder(id);
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

export async function updateLymphedemaOrderStatusController(req: Request, res: Response) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const order = await getLymphedemaOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  await updateLymphedemaOrderStatus(id, parsed.data.status);
  return res.json({ success: true });
}
