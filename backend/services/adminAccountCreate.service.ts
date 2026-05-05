import { z } from "zod";

import { adminAcct } from "../../db/admin";
import { clinicStaffAcct } from "../../db/clinic-staff";
import { getDb } from "./db";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import { HttpError } from "../utils/httpError";

function emptyStringToUndefined(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  // Accept either E.164 (+15551234567) or digits-only and normalize.
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // If 10 digits, assume US and prefix +1. Otherwise prefix +.
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

const phoneE164Schema = z
  .string()
  .regex(/^\+\d{10,15}$/, "Phone must be in E.164 format (e.g., +15551234567)");

export const adminAccountCreateSchema = z.object({
  accountPhone: z.preprocess(normalizePhone, phoneE164Schema),
  email: z.string().trim().email("Valid email address is required"),
  firstName: z
    .preprocess(emptyStringToUndefined, z.string().min(1))
    .transform((s) => s.trim()),
  lastName: z
    .preprocess(emptyStringToUndefined, z.string().min(1))
    .transform((s) => s.trim()),
  role: z.enum(["admin", "clinic_staff"]),
  skipApproval: z.boolean().optional(),
});

export type AdminAccountCreateInput = z.infer<typeof adminAccountCreateSchema>;

function mapSupabaseCreateUserErrorToHttpError(
  message: string,
): HttpError | null {
  const m = message || "";
  if (/email\s+address\s+has\s+already\s+been\s+registered/i.test(m)) {
    return new HttpError(409, "Email already registered", {
      code: "EMAIL_ALREADY_REGISTERED",
      details:
        "A user with this email address already exists. Please sign in or use a different email.",
    });
  }

  if (/phone\s+number\s+already\s+registered/i.test(m)) {
    return new HttpError(409, "Phone number already registered", {
      code: "PHONE_ALREADY_REGISTERED",
      details:
        "A user with this phone number already exists. Please sign in or use a different phone number.",
    });
  }

  return null;
}

async function findSupabaseAuthUserByEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  email: string,
) {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  const listUsers = (
    supabase as unknown as {
      auth?: { admin?: { listUsers?: unknown } };
    }
  )?.auth?.admin?.listUsers;

  if (typeof listUsers !== "function") return null;

  const perPage = 200;
  for (let page = 1; page <= 5; page += 1) {
    let data: {
      users?: Array<{
        id?: string;
        email?: string | null;
        phone?: string | null;
      }>;
    } | null = null;
    let error: unknown = null;

    try {
      ({ data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      }));
    } catch (e) {
      error = e;
    }

    if (error || !data?.users?.length) return null;

    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === target,
    );
    if (match) return match;

    if (data.users.length < perPage) return null;
  }

  return null;
}

export async function createAdminOrClinicStaffAccount(
  details: AdminAccountCreateInput,
) {
  const supabase = getSupabaseAdminClient();
  const db = getDb();

  const fullName = `${details.firstName} ${details.lastName}`.trim();

  // ITS Representative self-registrations start as inactive (pending admin approval)
  const isActiveOnCreate = details.role === "clinic_staff" && !details.skipApproval ? false : true;

  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email: details.email,
      phone: details.accountPhone,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        display_name: fullName,
        role: details.role,
        firstName: details.firstName,
        lastName: details.lastName,
      },
    });

  if (userError || !userData?.user?.id) {
    const message = userError?.message || "Failed to create user";
    const mapped = mapSupabaseCreateUserErrorToHttpError(message);

    if (
      mapped &&
      (mapped.code === "EMAIL_ALREADY_REGISTERED" ||
        mapped.code === "PHONE_ALREADY_REGISTERED")
    ) {
      const existingAuthUser = await findSupabaseAuthUserByEmail(
        supabase,
        details.email,
      );

      if (
        existingAuthUser?.id &&
        existingAuthUser.phone === details.accountPhone
      ) {
        if (details.role === "admin") {
          await db
            .insert(adminAcct)
            .values({
              email: details.email,
              accountPhone: details.accountPhone,
              firstName: details.firstName,
              lastName: details.lastName,
              role: "admin",
              userId: existingAuthUser.id,
              active: true,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: adminAcct.accountPhone,
              set: {
                email: details.email,
                firstName: details.firstName,
                lastName: details.lastName,
                role: "admin",
                userId: existingAuthUser.id,
                active: true,
                updatedAt: new Date(),
              },
            });
        } else {
          await db
            .insert(clinicStaffAcct)
            .values({
              email: details.email,
              accountPhone: details.accountPhone,
              firstName: details.firstName,
              lastName: details.lastName,
              userId: existingAuthUser.id,
              active: isActiveOnCreate,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: clinicStaffAcct.accountPhone,
              set: {
                email: details.email,
                firstName: details.firstName,
                lastName: details.lastName,
                userId: existingAuthUser.id,
                active: isActiveOnCreate,
                updatedAt: new Date(),
              },
            });
        }

        // Best-effort: ensure metadata stays in sync.
        await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          user_metadata: {
            full_name: fullName,
            name: fullName,
            display_name: fullName,
            role: details.role,
            firstName: details.firstName,
            lastName: details.lastName,
          },
        });

        return { userId: existingAuthUser.id };
      }

      throw mapped;
    }

    throw new HttpError(400, "Create account failed", {
      code: "CREATE_ACCOUNT_FAILED",
      details: message,
    });
  }

  const createdUserId = userData.user.id;

  try {
    if (details.role === "admin") {
      await db.insert(adminAcct).values({
        email: details.email,
        accountPhone: details.accountPhone,
        firstName: details.firstName,
        lastName: details.lastName,
        role: "admin",
        userId: createdUserId,
        active: true,
        updatedAt: new Date(),
      });
    } else {
      await db.insert(clinicStaffAcct).values({
        email: details.email,
        accountPhone: details.accountPhone,
        firstName: details.firstName,
        lastName: details.lastName,
        userId: createdUserId,
        active: isActiveOnCreate,
        updatedAt: new Date(),
      });
    }
  } catch (e) {
    // Avoid leaving orphaned auth users that later cause "phone already registered".
    try {
      await supabase.auth.admin.deleteUser(createdUserId);
    } catch {
      // Best-effort cleanup.
    }

    const maybe = e as { code?: unknown; message?: unknown };
    if (maybe && typeof maybe.code === "string" && maybe.code === "23505") {
      throw new HttpError(409, "Phone number already registered", {
        code: "PHONE_ALREADY_REGISTERED",
        details:
          "A user with this phone number already exists. Please sign in or use a different phone number.",
      });
    }

    throw e;
  }

  return { userId: createdUserId };
}
