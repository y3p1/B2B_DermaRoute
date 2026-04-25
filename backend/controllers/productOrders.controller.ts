import type { Request, Response } from "../http/types";

import {
  createOrderProduct,
  createOrderProductSchema,
  listAllOrderProducts,
  listOrderProductsForProvider,
  getOrderProductById,
  updateOrderProduct,
  deleteOrderProduct,
} from "../services/productOrders.service";
import {
  getAdminProfileByUserId,
  getAllAdminEmails,
  getAllAdminPhones,
} from "../services/adminAcct.service";
import { sendAdminAlertSms } from "../services/twilio.service";
import { getSettingByKey } from "../services/thresholdSettings.service";
import {
  getClinicStaffProfileByUserId,
  getAllClinicStaffEmails,
} from "../services/clinicStaffAcct.service";
import {
  getProviderProfileByUserId,
  getBvRequestById,
} from "../services/bvRequests.service";
import { sendOrderSubmissionNotification, sendOrderStatusNotificationToProvider } from "../services/sendgrid.service";
import { scoreOrder } from "../services/riskScoring.service";

function getLastPathSegment(pathname: string): string | null {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] ?? null;
}

export async function listOrderProductsController(
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
    const rows = await listAllOrderProducts();
    return res.json({ success: true, data: rows });
  }

  // Allow providers to view their own product orders
  const provider = await getProviderProfileByUserId(userId);
  if (provider) {
    const rows = await listOrderProductsForProvider(provider.id);
    return res.json({ success: true, data: rows });
  }

  return res.status(403).json({ error: "Access denied" });
}

export async function createOrderProductController(
  req: Request,
  res: Response,
) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Admins can manage/fulfill orders but NOT create them.
  const admin = await getAdminProfileByUserId(userId);
  if (admin) {
    return res
      .status(403)
      .json({ error: "Admins cannot create orders. Only providers and clinic staff can place orders." });
  }

  // Check if user is clinic staff or provider
  const clinicStaff = await getClinicStaffProfileByUserId(userId);
  const provider = clinicStaff ? null : await getProviderProfileByUserId(userId);

  if (!clinicStaff && !provider) {
    return res
      .status(403)
      .json({ error: "Access denied" });
  }

  const parsed = createOrderProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  // Provider-specific validation: BV must belong to provider and be approved
  if (provider) {
    const bvRequest = await getBvRequestById(parsed.data.bvRequestId);
    if (!bvRequest || bvRequest.providerId !== provider.id) {
      return res
        .status(403)
        .json({ error: "BV request does not belong to you" });
    }
    if (bvRequest.status !== "approved") {
      return res
        .status(400)
        .json({ error: "BV request must be approved before ordering" });
    }
  }

  const createdBy = clinicStaff ? clinicStaff.id : provider!.id;
  const createdByType: "clinic_staff" | "provider" = clinicStaff
    ? "clinic_staff"
    : "provider";

  // --- Risk scoring (Phase 10b) ---
  // Fetch full BV details for scoring (we need a1c, diabetic, infected, tunneling)
  const bvForScoring = await getBvRequestById(parsed.data.bvRequestId);
  const riskResult = bvForScoring
    ? await scoreOrder({
      a1cPercent: bvForScoring.a1cPercent,
      diabetic: bvForScoring.diabetic,
      woundSize: bvForScoring.woundSize,
      infected: bvForScoring.infected,
      tunneling: bvForScoring.tunneling,
      woundType: bvForScoring.woundType,
    })
    : null;

  // Hard-block if any blockers (e.g. A1C exceeds threshold)
  if (riskResult && riskResult.blockers.length > 0) {
    return res.status(422).json({
      error: "Order blocked due to risk assessment",
      blockers: riskResult.blockers,
      reasons: riskResult.reasons,
      score: riskResult.score,
      tier: riskResult.tier,
    });
  }
  // --------------------------------

  const created = await createOrderProduct(
    parsed.data,
    createdBy,
    createdByType,
    riskResult?.score,
    riskResult?.tier,
  );

  // --- Send Critical Risk SMS Alerts (Phase 10e) ---
  if (riskResult?.tier === "critical") {
    (async () => {
      try {
        const smsEnabledSetting = await getSettingByKey("risk_critical_sms_enabled");
        if (smsEnabledSetting?.value === "true") {
          const adminPhones = await getAllAdminPhones();
          if (adminPhones.length > 0) {
            const bvRequest = await getBvRequestById(parsed.data.bvRequestId);
            const initials = bvRequest?.initials || "Unknown";
            const msg = `CRITICAL ALERT: High risk order placed for patient ${initials} (Risk Score: ${riskResult.score}). Please review in dashboard immediately.`;
            // Trigger all SMS in parallel
            await Promise.allSettled(
              adminPhones.map((phone) => sendAdminAlertSms(phone, msg))
            );
          }
        }
      } catch (err) {
        console.error("Failed to send critical SMS alerts:", err);
      }
    })();
  }
  // -------------------------------------------------

  // Send email notification to admins and clinic staff (fire-and-forget)
  (async () => {
    try {
      const [adminEmails, clinicStaffEmails] = await Promise.all([
        getAllAdminEmails(),
        getAllClinicStaffEmails(),
      ]);

      const allRecipients = Array.from(
        new Set([...adminEmails, ...clinicStaffEmails]),
      );

      if (allRecipients.length > 0) {
        // Fetch full order details (joined with BV, provider, manufacturer, product)
        const orderDetails = await getOrderProductById(created.id);
        // Fetch BV request for patient initials
        const bvRequest = await getBvRequestById(parsed.data.bvRequestId);

        if (orderDetails) {
          await sendOrderSubmissionNotification(allRecipients, {
            orderId: created.id,
            practiceName: orderDetails.practice || "Unknown Practice",
            provider: orderDetails.provider || "Unknown Provider",
            productName: orderDetails.product || "Unknown Product",
            productCode: orderDetails.productCode || "",
            manufacturer: orderDetails.manufacturer || "Unknown Manufacturer",
            patientInitials: bvRequest?.initials || "N/A",
            insurance: orderDetails.insurance || "N/A",
            woundType: orderDetails.woundType || "N/A",
            woundSize: orderDetails.woundSize || "N/A",
            deliveryAddress: created.deliveryAddress ?? undefined,
            deliveryCity: created.deliveryCity ?? undefined,
            deliveryState: created.deliveryState ?? undefined,
            deliveryZip: created.deliveryZip ?? undefined,
            deliveryDate: created.deliveryDate ?? undefined,
            contactPhone: created.contactPhone ?? undefined,
            notes: created.notes ?? undefined,
            createdAt: created.createdAt?.toISOString() || new Date().toISOString(),
          });
        }
      } else {
        console.warn(
          "⚠️ No admin or clinic staff emails found for order notification",
        );
      }
    } catch (emailError) {
      console.error("❌ Failed to send order notification email:", emailError);
    }
  })();

  return res.status(201).json({ success: true, data: created });
}

export async function getOrderProductController(req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if user is admin or clinic staff
  const admin = await getAdminProfileByUserId(userId);
  const clinicStaff = admin
    ? null
    : await getClinicStaffProfileByUserId(userId);
  const provider = (!admin && !clinicStaff) ? await getProviderProfileByUserId(userId) : null;

  if (!admin && !clinicStaff && !provider) {
    return res
      .status(403)
      .json({ error: "Access denied" });
  }

  const id = getLastPathSegment(req.url);
  if (!id) {
    return res.status(400).json({ error: "Product order ID is required" });
  }

  const order = await getOrderProductById(id);
  if (!order) {
    return res.status(404).json({ error: "Product order not found" });
  }

  if (provider && order.providerId !== provider.id) {
    return res.status(403).json({ error: "You do not have permission to access this order" });
  }

  return res.json({ success: true, data: order });
}

export async function updateOrderProductController(
  req: Request,
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
  const provider = (!admin && !clinicStaff) ? await getProviderProfileByUserId(userId) : null;

  if (!admin && !clinicStaff && !provider) {
    return res
      .status(403)
      .json({ error: "Access denied" });
  }

  const id = getLastPathSegment(req.url);
  if (!id) {
    return res.status(400).json({ error: "Product order ID is required" });
  }

  const body = req.body as {
    status?: string;
    notes?: string;
    manufacturerId?: string;
    productId?: string;
  };

  // Provider cannot change status
  if (provider && body.status) {
    return res.status(403).json({ error: "Providers cannot change order status" });
  }

  const orderForChecking = await getOrderProductById(id);
  if (provider && orderForChecking?.providerId !== provider.id) {
    return res.status(403).json({ error: "You do not have permission to access this order" });
  }

  const { status, notes, manufacturerId, productId } = body;

  const updated = await updateOrderProduct(id, {
    status,
    notes,
    manufacturerId,
    productId,
  });

  // Re-fetch the full joined data so the response includes practice, provider,
  // manufacturer name, product name, BV details, etc. — not just raw columns.
  const fullDetail = await getOrderProductById(id);

  // Send email notification to provider for status changes
  const notifiableStatuses: Array<import("../services/sendgrid.service").OrderStatusType> = [
    "approved", "shipped", "completed", "denied", "cancelled",
  ];
  if (
    status &&
    notifiableStatuses.includes(status as any) &&
    fullDetail?.providerEmail &&
    fullDetail?.patientInitials &&
    fullDetail?.product
  ) {
    await sendOrderStatusNotificationToProvider(fullDetail.providerEmail, {
      orderId: id,
      patientInitials: fullDetail.patientInitials,
      productName: fullDetail.product,
      status: status as import("../services/sendgrid.service").OrderStatusType,
    }).catch(err => console.error(`Failed to send order ${status} email:`, err));
  }

  return res.json({ success: true, data: fullDetail ?? updated });
}

export async function deleteOrderProductController(
  req: Request,
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
  const provider = (!admin && !clinicStaff) ? await getProviderProfileByUserId(userId) : null;

  if (!admin && !clinicStaff && !provider) {
    return res
      .status(403)
      .json({ error: "Access denied" });
  }

  const id = getLastPathSegment(req.url);
  if (!id) {
    return res.status(400).json({ error: "Product order ID is required" });
  }

  // Check if order exists
  const order = await getOrderProductById(id);
  if (!order) {
    return res.status(404).json({ error: "Product order not found" });
  }

  if (provider && order.providerId !== provider.id) {
    return res.status(403).json({ error: "You do not have permission to delete this order" });
  }

  await deleteOrderProduct(id);

  return res.json({
    success: true,
    message: "Product order deleted successfully",
  });
}
