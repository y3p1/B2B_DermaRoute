import type { Request, Response } from "../http/types";

import { z } from "zod";

import {
  adminAccountCreateSchema,
  createAdminOrClinicStaffAccount,
} from "../services/adminAccountCreate.service";
import { getAllAdminEmails } from "../services/adminAcct.service";
import { sendPendingItsRepNotification } from "../services/sendgrid.service";
import { asyncHandler } from "../utils/asyncHandler";

const clinicStaffSignupSchema = adminAccountCreateSchema.omit({ role: true, skipApproval: true });

type ClinicStaffSignupRequest = z.infer<typeof clinicStaffSignupSchema>;

export const clinicStaffSignupController = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = clinicStaffSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const data: ClinicStaffSignupRequest = parsed.data;

    const result = await createAdminOrClinicStaffAccount({
      ...data,
      role: "clinic_staff",
      // Self-signups do NOT skip approval — account created as inactive
    });

    // Fire-and-forget: notify admins of pending ITS Representative registration
    (async () => {
      try {
        const adminEmails = await getAllAdminEmails();
        if (adminEmails.length > 0) {
          await sendPendingItsRepNotification(adminEmails, {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.accountPhone,
          });
        }
      } catch (err) {
        console.error("Failed to send ITS Rep pending notification:", err);
      }
    })();

    return res.status(201).json({
      message: "Registration submitted. Your account is pending admin approval.",
      user_id: result.userId,
    });
  },
);
