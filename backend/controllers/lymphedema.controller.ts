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
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { isDemoMode } from "../../lib/demoMode";
import { getSetting } from "../services/systemSettings.service";
import { sendEmail } from "../services/sendgrid.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listLymphedemaOrdersController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const demoRole = res.locals.demoRole as string | undefined;

  if (isDemoMode()) {
    if (demoRole === "admin" || demoRole === "clinic_staff") {
      const orders = await getLymphedemaOrders();
      return res.json({ success: true, data: orders });
    }
    // Provider demo roles → scope to their own seeded orders
    const provider = await getProviderProfileByUserId(userId);
    if (!provider) {
      return res.json({ success: true, data: [] });
    }
    const orders = await getLymphedemaOrders({ providerIds: [provider.id] });
    return res.json({ success: true, data: orders });
  }

  const adminProfile = await getAdminProfileByUserId(userId);
  if (adminProfile) {
    const orders = await getLymphedemaOrders();
    return res.json({ success: true, data: orders });
  }

  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (clinicStaff) {
    const providerIds = await getAssignedProviderIds(clinicStaff.id);
    const orders = await getLymphedemaOrders({ providerIds });
    return res.json({ success: true, data: orders });
  }

  const provider = await getProviderProfileByUserId(userId);
  if (provider) {
    const orders = await getLymphedemaOrders({ providerIds: [provider.id] });
    return res.json({ success: true, data: orders });
  }

  return res.status(403).json({ error: "Forbidden" });
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
  return res.status(201).json({ success: true, data: { id } });
}

export async function getLymphedemaOrderController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const demoRole = res.locals.demoRole as string | undefined;
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const order = await getLymphedemaOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  if (isDemoMode()) {
    if (demoRole === "admin" || demoRole === "clinic_staff") {
      return res.json({ success: true, data: order });
    }
    const provider = await getProviderProfileByUserId(userId);
    if (!provider) return res.status(403).json({ error: "Forbidden" });
    if (order.providerId && order.providerId !== provider.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ success: true, data: order });
  }

  const adminProfile = await getAdminProfileByUserId(userId);
  if (adminProfile) return res.json({ success: true, data: order });

  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (clinicStaff) {
    if (order.providerId) {
      const allowed = await isProviderAssignedToRep(order.providerId, clinicStaff.id);
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ success: true, data: order });
  }

  const provider = await getProviderProfileByUserId(userId);
  if (provider) {
    if (order.providerId && order.providerId !== provider.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json({ success: true, data: order });
  }

  return res.status(403).json({ error: "Forbidden" });
}

const updateStatusSchema = z.object({
  status: z.enum(["pending_review", "pending", "approved", "shipped", "completed", "denied", "cancelled"]),
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

export async function sendLymphedemaOrderEmailController(req: Request, res: Response) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const order = await getLymphedemaOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  let submissionEmail = "Lb@centralpalmsmedical.com";
  if (isDemoMode()) {
    submissionEmail = "shawn.druzali04@gmail.com";
  } else {
    const configured = await getSetting("lymphedema_submission_email");
    if (configured) submissionEmail = configured;
  }

  const patientRaw = order.patient as { firstName?: string; lastName?: string; fullName?: string } | null;
  const patientName =
    patientRaw?.fullName ??
    ([patientRaw?.firstName, patientRaw?.lastName].filter(Boolean).join(" ") || "Unknown");

  try {
    await sendEmail({
      to: submissionEmail,
      subject: `Lymphedema Order — ${patientName}`,
      text: [
        `LYMPHEDEMA ORDER (Approved by DR Representative)`,
        ``,
        `Patient: ${patientName}`,
        `Insurance: ${order.insurance ?? "N/A"}`,
        `Device: ${order.device ?? "N/A"}`,
        `HCPCS: ${order.hcpcs ?? "N/A"}`,
        `Garment: ${[order.garmentStyle, order.garmentType ? `(${order.garmentType})` : ""].filter(Boolean).join(" ") || "N/A"}`,
        `Compression: ${order.compressionLevel ?? "N/A"}`,
        `Quantity: ${order.quantity ?? "N/A"}`,
        `Manufacturer: ${order.manufacturerPreference ?? "N/A"}`,
        `Distal Pressure: ${order.distalPressureMmhg ? `${order.distalPressureMmhg} mmHg` : "N/A"}`,
        `Times/Day: ${order.timesPerDay ?? "N/A"}`,
        `Min/Session: ${order.minutesPerSession ?? "N/A"}`,
        ``,
        `Order ID: ${id}`,
      ].join("\n"),
    });
    await updateLymphedemaOrderStatus(id, order.status, submissionEmail);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to send email" });
  }
}
