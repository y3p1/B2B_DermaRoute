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
import { getAdminProfileByUserId } from "../services/adminAcct.service";
import { isDemoMode } from "../../lib/demoMode";
import { getSetting } from "../services/systemSettings.service";
import { sendEmail } from "../services/sendgrid.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listOcularOrdersController(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const demoRole = res.locals.demoRole as string | undefined;

  if (isDemoMode()) {
    if (demoRole === "admin" || demoRole === "clinic_staff") {
      const orders = await getOcularOrders();
      return res.json({ success: true, data: orders });
    }
    return res.json({ success: true, data: [] });
  }

  const adminProfile = await getAdminProfileByUserId(userId);
  if (adminProfile) {
    const orders = await getOcularOrders();
    return res.json({ success: true, data: orders });
  }

  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  if (clinicStaff) {
    const providerIds = await getAssignedProviderIds(clinicStaff.id);
    const orders = await getOcularOrders({ providerIds });
    return res.json({ success: true, data: orders });
  }

  const provider = await getProviderProfileByUserId(userId);
  if (provider) {
    const orders = await getOcularOrders({ providerIds: [provider.id] });
    return res.json({ success: true, data: orders });
  }

  return res.status(403).json({ error: "Forbidden" });
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

  // Send notification to ITS rep (not directly to Skye Biologics)
  let repEmail = "team@nvzn.ai";
  if (!isDemoMode()) {
    const configured = await getSetting("ocular_rep_notification_email");
    if (configured) repEmail = configured;
  }

  const patient = parsed.data.patient;
  const qty = parsed.data.quantity;
  const shippingCost = qty >= 21 ? "$65" : qty >= 9 ? "$45" : "$40";

  try {
    await sendEmail({
      to: repEmail,
      subject: `New VisiDisc® Order — ${patient.lastName}, ${patient.firstName} | ${provider.clinicName}`,
      text: [
        `PATIENT INFORMATION`,
        `Full Name: ${patient.firstName} ${patient.lastName}`,
        `Date of Birth: ${patient.dob}`,
        ...(patient.mrn ? [`MRN: ${patient.mrn}`] : []),
        ``,
        `ORDERING PHYSICIAN`,
        `Physician: ${provider.clinicName}`,
        `NPI: ${provider.npiNumber}`,
        `Phone: ${provider.clinicPhone ?? provider.accountPhone}`,
        ``,
        `DIAGNOSIS`,
        `Primary ICD-10: ${parsed.data.primaryDiagnosis}`,
        ...(parsed.data.secondaryDiagnosis ? [`Secondary ICD-10: ${parsed.data.secondaryDiagnosis}`] : []),
        `Eye Treated: ${parsed.data.eye}`,
        `CPT Code: 65778`,
        ...(parsed.data.specialInstructions ? [`Clinical Notes: ${parsed.data.specialInstructions}`] : []),
        ``,
        `PRODUCT`,
        `Variant: ${parsed.data.productVariant === "thin" ? "Thin (45μm)" : "Thick (200μm)"}`,
        `Disc Size: ${parsed.data.sizeMm}mm`,
        `SKU: ${parsed.data.sku}`,
        `Quantity: ${qty}`,
        `Shipping Cost: ${shippingCost}`,
        ...(parsed.data.dateNeededBy ? [`Date Needed By: ${parsed.data.dateNeededBy}`] : []),
        ``,
        `SHIPPING`,
        `Address: ${[parsed.data.shipTo?.address, parsed.data.shipTo?.city, parsed.data.shipTo?.state, parsed.data.shipTo?.zip].filter(Boolean).join(", ") || "N/A"}`,
        ``,
        ...(parsed.data.insurancePayer ? [
          `INSURANCE`,
          `Payer: ${parsed.data.insurancePayer}`,
          ...(parsed.data.insuranceMemberId ? [`Member ID: ${parsed.data.insuranceMemberId}`] : []),
        ] : []),
        ``,
        `Order ID: ${id}`,
      ].join("\n"),
    });
  } catch {
    // Non-fatal
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
  status: z.enum(["pending_review", "pending", "approved", "shipped", "completed", "denied", "cancelled"]),
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

export async function sendOcularOrderEmailController(req: Request, res: Response) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const order = await getOcularOrder(id);
  if (!order) return res.status(404).json({ error: "Not found" });

  let submissionEmail = "orders@skyebiologics.com";
  if (isDemoMode()) {
    submissionEmail = "shawn.druzali04@gmail.com";
  } else {
    const configured = await getSetting("ocular_submission_email");
    if (configured) submissionEmail = configured;
  }

  const patient = order.patient as { firstName?: string; lastName?: string; dob?: string; mrn?: string } | null;
  const shipTo = order.shipTo as { address?: string; city?: string; state?: string; zip?: string } | null;
  const qty = order.quantity ?? 1;
  const shippingCost = qty >= 21 ? "$65" : qty >= 9 ? "$45" : "$40";

  try {
    await sendEmail({
      to: submissionEmail,
      subject: `VisiDisc® Order — ${patient?.lastName ?? ""}, ${patient?.firstName ?? ""} (ITS Approved)`,
      text: [
        `PATIENT INFORMATION`,
        `Full Name: ${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`,
        `Date of Birth: ${patient?.dob ?? "N/A"}`,
        ...(patient?.mrn ? [`MRN: ${patient.mrn}`] : []),
        ``,
        `DIAGNOSIS`,
        `Primary: ${order.primaryDiagnosis ?? "N/A"}`,
        ...(order.secondaryDiagnosis ? [`Secondary: ${order.secondaryDiagnosis}`] : []),
        `Eye Treated: ${order.eye ?? "N/A"}`,
        `CPT Code: 65778`,
        ``,
        `PRODUCT`,
        `Variant: ${order.productVariant === "thin" ? "Thin (45μm)" : "Thick (200μm)"}`,
        `Disc Size: ${order.sizeMm}mm`,
        `SKU: ${order.sku ?? "N/A"}`,
        `Quantity: ${qty}`,
        `Shipping Cost: ${shippingCost}`,
        ...(order.dateNeededBy ? [`Date Needed By: ${String(order.dateNeededBy)}`] : []),
        ``,
        `SHIPPING`,
        `Address: ${[shipTo?.address, shipTo?.city, shipTo?.state, shipTo?.zip].filter(Boolean).join(", ") || "N/A"}`,
        ...(order.specialInstructions ? [`Special Instructions: ${order.specialInstructions}`] : []),
        ``,
        ...(order.insurancePayer ? [
          `INSURANCE`,
          `Payer: ${order.insurancePayer}`,
          ...(order.insuranceMemberId ? [`Member ID: ${order.insuranceMemberId}`] : []),
        ] : []),
        ``,
        `Order ID: ${id}`,
      ].join("\n"),
    });
    await updateOcularOrderStatus(id, order.status, submissionEmail);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to send email" });
  }
}
