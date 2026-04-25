import type { Request, Response } from "../http/types";
import { z } from "zod";

import { eq } from "drizzle-orm";

import { providerAcct } from "../../db/provider";
import { adminAcct } from "../../db/admin";
import { clinicStaffAcct } from "../../db/clinic-staff";
import { getDb } from "../services/db";
import { getSupabaseAdminClient } from "../services/supabaseAdmin";
import {
  sendOtpSms,
  verifyOtp as verifyTwilioOtp,
} from "../services/twilio.service";

const otpModeSchema = z.enum(["signin", "signup"]);

function isSupabaseSignupsNotAllowedForOtpError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeErr = error as { message?: unknown };
  const message = typeof maybeErr.message === "string" ? maybeErr.message : "";
  return /signups\s+not\s+allowed/i.test(message);
}

function normalizePhoneE164(phone: string) {
  const trimmed = phone.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

const sendSchema = z.object({
  phone: z.string().min(1, "Missing phone"),
  mode: otpModeSchema.optional(),
  role: z.enum(["provider", "admin", "clinic_staff"]).optional(),
});

function isTwilioMaxSendAttemptsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeErr = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };

  // Twilio Verify: 60203 = Max send attempts reached
  if (maybeErr.code === 60203) return true;

  const message = typeof maybeErr.message === "string" ? maybeErr.message : "";
  if (/max\s+send\s+attempts\s+reached/i.test(message)) return true;

  // Some Twilio errors also surface as HTTP 429.
  if (maybeErr.status === 429) return true;

  return false;
}

function isTwilioMaxCheckAttemptsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeErr = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };

  // Twilio Verify: 60202 = Max check attempts reached
  if (maybeErr.code === 60202) return true;

  const message = typeof maybeErr.message === "string" ? maybeErr.message : "";
  if (/max\s+check\s+attempts\s+reached/i.test(message)) return true;
  if (/too\s+many\s+attempts/i.test(message)) return true;

  if (maybeErr.status === 429) return true;

  return false;
}

function isTwilioFraudGuardBlockedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeErr = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };

  // Twilio Verify: 60410 (Fraud Guard block)
  if (maybeErr.code === 60410) return true;

  const message = typeof maybeErr.message === "string" ? maybeErr.message : "";
  if (/\b60410\b/.test(message)) return true;
  if (/twilio\.com\/docs\/errors\/60410/i.test(message)) return true;
  if (/temporarily\s+blocked/i.test(message) && /twilio/i.test(message))
    return true;

  // Some Twilio blocks can surface as HTTP 403/429.
  if (maybeErr.status === 403 || maybeErr.status === 429) {
    if (/fraud/i.test(message) || /traffic\s+pumping/i.test(message))
      return true;
  }

  return false;
}

export async function sendOtpController(req: Request, res: Response) {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing phone" });
  }

  const phone = normalizePhoneE164(parsed.data.phone);
  const mode = parsed.data.mode ?? "signin";

  try {
    if (mode === "signup") {
      // For signup we only verify phone ownership (Twilio Verify) and do NOT create Supabase auth users.
      await sendOtpSms(phone);
      return res.json({ success: true });
    }

    // mode === "signin": only allow OTP for registered provider phones
    const db = getDb();
    const existingProvider = await db
      .select({ id: providerAcct.id, userId: providerAcct.userId })
      .from(providerAcct)
      .where(eq(providerAcct.accountPhone, phone))
      .limit(1);

    const existingAdmin = await db
      .select({ id: adminAcct.id, userId: adminAcct.userId })
      .from(adminAcct)
      .where(eq(adminAcct.accountPhone, phone))
      .limit(1);

    const existingClinicStaff = await db
      .select({ id: clinicStaffAcct.id, userId: clinicStaffAcct.userId, active: clinicStaffAcct.active })
      .from(clinicStaffAcct)
      .where(eq(clinicStaffAcct.accountPhone, phone))
      .limit(1);

    if (!existingProvider[0] && !existingAdmin[0] && !existingClinicStaff[0]) {
      return res.status(404).json({ error: "Phone is not registered" });
    }

    // Block inactive ITS Representatives (pending admin approval)
    if (existingClinicStaff[0] && !existingClinicStaff[0].active && !existingAdmin[0]) {
      return res.status(403).json({
        error: "Your account is pending admin approval. Please contact an administrator.",
      });
    }

    // Enforce intended role when provided by the client.
    const intendedRole = parsed.data.role as
      | "provider"
      | "admin"
      | "clinic_staff"
      | undefined;

    if (intendedRole) {
      if (intendedRole === "provider" && !existingProvider[0] && !existingAdmin[0]) {
        return res
          .status(403)
          .json({ error: "Phone not authorized as provider" });
      }
      if (intendedRole === "admin" && !existingAdmin[0]) {
        return res.status(403).json({ error: "Phone not authorized as admin" });
      }
      if (intendedRole === "clinic_staff" && !existingClinicStaff[0] && !existingAdmin[0]) {
        return res
          .status(403)
          .json({ error: "Phone not authorized as clinic staff" });
      }
    }

    const supabase = getSupabaseAdminClient();
    const signIn = async () =>
      supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: false },
      });

    // Ensure we do NOT create new auth users during signin.
    let { data, error } = await signIn();

    // Recovery path: admin/provider exists in our DB, but the Supabase auth user
    // is missing a phone, so Supabase treats OTP as a signup and rejects it.
    if (error && isSupabaseSignupsNotAllowedForOtpError(error)) {
      const userId =
        existingProvider[0]?.userId ??
        existingAdmin[0]?.userId ??
        existingClinicStaff[0]?.userId ??
        null;

      if (userId) {
        const updateRes = await supabase.auth.admin.updateUserById(userId, {
          phone,
        });

        if (!updateRes.error) {
          ({ data, error } = await signIn());
        }
      }
    }

    if (error) {
      return res
        .status(400)
        .json({ error: error.message || "Failed to send code" });
    }

    // Supabase returns { user: null, session: null } here until /verify-otp succeeds.
    return res.json({ success: true, data });
  } catch (error) {
    if (mode === "signup" && isTwilioMaxSendAttemptsError(error)) {
      return res.status(429).json({
        error:
          "Rate limited: max OTP send attempts reached. Try again after 10 minutes.",
      });
    }

    if (mode === "signup" && isTwilioFraudGuardBlockedError(error)) {
      return res.status(429).json({
        error: "Phone number temporarily blocked for OTP.",
        code: "TWILIO_VERIFY_BLOCKED",
        provider: "twilio",
        providerCode: 60410,
        helpUrl: "https://www.twilio.com/docs/errors/60410",
        details:
          "Our SMS provider temporarily blocked this number/prefix after detecting patterns that look like fraud (for example, repeated OTP requests in a short time).",
        nextSteps: [
          "Stop requesting new codes for this number.",
          "Wait for the block to expire (often 5 minutes to 12 hours).",
          "Try again later or use a different number.",
          "If it persists, contact support so we can review provider settings.",
        ],
      });
    }

    const err = error as { message?: string };
    console.error(error);
    return res
      .status(500)
      .json({ error: err.message || "Failed to send code" });
  }
}

const verifySchema = z.object({
  phone: z.string().min(1),
  code: z.string().min(1),
  mode: otpModeSchema.optional(),
  role: z.enum(["provider", "admin", "clinic_staff"]).optional(),
});

export async function verifyOtpController(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing phone or code" });
  }

  const phone = normalizePhoneE164(parsed.data.phone);
  const mode = parsed.data.mode ?? "signin";

  try {
    if (mode === "signup") {
      let ok: boolean;
      try {
        ok = await verifyTwilioOtp(phone, parsed.data.code);
      } catch (error) {
        if (isTwilioMaxCheckAttemptsError(error)) {
          return res.status(429).json({
            error:
              "Rate limited: too many OTP verification attempts. Try again after 10 minutes.",
          });
        }
        throw error;
      }

      if (!ok) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }
      return res.json({ success: true });
    }

    // mode === "signin": verify via Supabase and return a session
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: parsed.data.code,
      type: "sms",
    });

    if (error) {
      return res
        .status(400)
        .json({ error: error.message || "Invalid or expired code" });
    }

    // Extra guard: ensure this auth user is tied to provider_acct
    const userId = data.user?.id;
    if (!userId) {
      return res
        .status(400)
        .json({ error: "Verification succeeded but no user returned" });
    }

    const db = getDb();
    const existingProvider = await db
      .select({ id: providerAcct.id })
      .from(providerAcct)
      .where(eq(providerAcct.userId, userId))
      .limit(1);

    const existingAdmin = await db
      .select({ id: adminAcct.id })
      .from(adminAcct)
      .where(eq(adminAcct.userId, userId))
      .limit(1);

    const existingClinicStaff = await db
      .select({ id: clinicStaffAcct.id, active: clinicStaffAcct.active })
      .from(clinicStaffAcct)
      .where(eq(clinicStaffAcct.userId, userId))
      .limit(1);

    if (!existingProvider[0] && !existingAdmin[0] && !existingClinicStaff[0]) {
      return res.status(403).json({
        error: "No provider/admin/clinic_staff profile found for this account",
      });
    }

    // Block inactive ITS Representatives (pending admin approval)
    if (existingClinicStaff[0] && !existingClinicStaff[0].active && !existingAdmin[0]) {
      return res.status(403).json({
        error: "Your account is pending admin approval. Please contact an administrator.",
      });
    }

    const intendedRoleVerify = parsed.data.role as
      | "provider"
      | "admin"
      | "clinic_staff"
      | undefined;

    if (intendedRoleVerify) {
      if (intendedRoleVerify === "provider" && !existingProvider[0] && !existingAdmin[0]) {
        return res
          .status(403)
          .json({ error: "Account not authorized as provider" });
      }
      if (intendedRoleVerify === "admin" && !existingAdmin[0]) {
        return res
          .status(403)
          .json({ error: "Account not authorized as admin" });
      }
      if (intendedRoleVerify === "clinic_staff" && !existingClinicStaff[0] && !existingAdmin[0]) {
        return res
          .status(403)
          .json({ error: "Account not authorized as clinic staff" });
      }
    }

    return res.json({ success: true, data });
  } catch (error) {
    const err = error as { message?: string };
    console.error("Supabase verify error:", error);
    return res
      .status(500)
      .json({ error: err.message || "Verification failed" });
  }
}
