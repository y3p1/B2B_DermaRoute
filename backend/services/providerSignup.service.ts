import { z } from "zod";

import crypto from "crypto";

import { eq } from "drizzle-orm";

import { providerAcct } from "../../db/provider";
import { baaProvider } from "../../db/schema";
import { getDb } from "./db";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import { providerSpecialties } from "../../shared/providerSpecialties";
import { HttpError } from "../utils/httpError";
import {
  type BaaSignatureInput,
  toBaaInsertValues,
} from "./baaProvider.service";
import { uploadBaaSignatureFromDataUrl } from "./baaSignatureStorage.service";
import { getAllAdminEmails } from "./adminAcct.service";
import { getAllClinicStaffEmails } from "./clinicStaffAcct.service";
import {
  sendBaaAgreementNotification,
  sendProviderAccountCreatedNotification,
} from "./sendgrid.service";

function notifyProviderAccountCreatedBestEffort(params: {
  userId: string;
  providerAcctId?: string;
  details: ClinicDetails;
  createdAt: string;
}) {
  (async () => {
    try {
      const [adminEmails, clinicStaffEmails] = await Promise.all([
        getAllAdminEmails(),
        getAllClinicStaffEmails(),
      ]);

      const payloadBase = {
        providerUserId: params.userId,
        providerAcctId: params.providerAcctId,
        clinicName: params.details.clinicName || "Unknown Clinic",
        providerEmail: params.details.email,
        accountPhone: params.details.accountPhone,
        npiNumber: params.details.npiNumber,
        clinicAddress: params.details.clinicAddress,
        clinicPhone: params.details.clinicPhone,
        providerSpecialty: params.details.providerSpecialty,
        createdAt: params.createdAt,
      };

      if (adminEmails.length > 0) {
        await sendProviderAccountCreatedNotification(adminEmails, {
          ...payloadBase,
          dashboardUrl: "/admin",
        });
      }

      if (clinicStaffEmails.length > 0) {
        await sendProviderAccountCreatedNotification(clinicStaffEmails, {
          ...payloadBase,
          dashboardUrl: "/clinic-staff",
        });
      }

      if (adminEmails.length === 0 && clinicStaffEmails.length === 0) {
        console.warn(
          "⚠️ [Provider Email] No admin or clinic staff emails found - skipping provider-created notification",
        );
      }
    } catch (emailError) {
      console.error(
        "❌ [Provider Email] Failed to send provider-created notification email:",
        emailError,
      );
    }
  })();
}

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
  // Keep this bounded; only used for recovery when Supabase reports a conflict.
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

    const match = data.users.find((u) => {
      const userEmail = (u.email ?? "").toLowerCase();
      return userEmail === target;
    });

    if (match) return match;

    if (data.users.length < perPage) return null;
  }

  return null;
}

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

const npiSchema = z
  .string()
  .regex(/^\d{10}$/, "NPI number must be exactly 10 digits");

const optionalMin = (min: number, message: string) =>
  z.preprocess(emptyStringToUndefined, z.string().min(min, message).optional());

export const clinicDetailsSchema = z.object({
  accountPhone: z.preprocess(normalizePhone, phoneE164Schema),
  email: z.string().trim().email("Valid email address is required"),
  npiNumber: z.preprocess(emptyStringToUndefined, npiSchema),
  clinicName: z.string().trim().min(2, "Clinic/Practice name is required"),
  clinicAddress: optionalMin(5, "Clinic address must be at least 5 characters"),
  clinicPhone: z.preprocess((value) => {
    const maybe = emptyStringToUndefined(value);
    if (maybe === undefined) return undefined;
    return normalizePhone(maybe);
  }, phoneE164Schema.optional()),
  providerSpecialty: z.preprocess(
    emptyStringToUndefined,
    z.enum(providerSpecialties).optional(),
  ),
  taxId: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .regex(/^\d{2}-?\d{7}$/, "Tax ID must look like 12-3456789")
      .optional(),
  ),
  groupNpi: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .regex(/^\d{10}$/, "Group NPI must be exactly 10 digits")
      .optional(),
  ),
});

export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;

export async function providerSignup(
  details: ClinicDetails,
  baa?: BaaSignatureInput,
) {
  const supabase = getSupabaseAdminClient();
  const db = getDb();

  const { data: userData, error: userError } =
    await supabase.auth.admin.createUser({
      email: details.email,
      phone: details.accountPhone,
      email_confirm: true,
      user_metadata: {
        full_name: details.clinicName,
        name: details.clinicName,
        display_name: details.clinicName,
        role: "provider",
        clinicName: details.clinicName,
      },
    });

  if (userError || !userData?.user?.id) {
    const message = userError?.message || "Failed to create user";
    const mapped = mapSupabaseCreateUserErrorToHttpError(message);

    // Recovery path: if the auth user already exists (common when a prior signup
    // attempt created the auth user but failed before inserting provider_acct),
    // allow completing signup by creating the missing provider_acct row.
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
        const existingProviderByUser = await db
          .select({ id: providerAcct.id })
          .from(providerAcct)
          .where(eq(providerAcct.userId, existingAuthUser.id))
          .limit(1);

        if (!existingProviderByUser[0]) {
          const insertedProvider = await db
            .insert(providerAcct)
            .values({
              userId: existingAuthUser.id,
              ...details,
            })
            .returning({ id: providerAcct.id });

          const providerAcctId = insertedProvider[0]?.id;

          if (baa) {
            if (providerAcctId) {
              const baaId = crypto.randomUUID();

              let uploadedCovered: { bucket: string; key: string };
              try {
                uploadedCovered = await uploadBaaSignatureFromDataUrl({
                  providerAcctId,
                  baaId,
                  type: "covered_entity",
                  dataUrl: baa.coveredEntitySignature,
                });
              } catch (e) {
                // If we can't save the signature, treat the whole signup as failed.
                await db
                  .delete(providerAcct)
                  .where(eq(providerAcct.userId, existingAuthUser.id));
                const msg =
                  e instanceof Error ? e.message : "Failed to upload signature";
                throw new HttpError(400, "Signup failed", {
                  code: "BAA_SIGNATURE_UPLOAD_FAILED",
                  details: msg,
                });
              }

              let businessKey: string | undefined;
              if (
                baa.businessAssociateSignature &&
                baa.businessAssociateSignature.trim()
              ) {
                try {
                  ({ key: businessKey } = await uploadBaaSignatureFromDataUrl({
                    providerAcctId,
                    baaId,
                    type: "business_associate",
                    dataUrl: baa.businessAssociateSignature,
                  }));
                } catch {
                  // Optional; ignore for now.
                  businessKey = undefined;
                }
              }

              const values: typeof baaProvider.$inferInsert = {
                id: baaId,
                ...toBaaInsertValues(providerAcctId, baa),
                coveredEntitySignature: uploadedCovered.key,
                businessAssociateSignature: businessKey,
              };

              await db.insert(baaProvider).values(values);

              // Send email notifications to admins and clinic staff asynchronously
              console.log(
                `🔔 [BAA Email] Starting email notification process for BAA ID: ${baaId}`,
              );
              (async () => {
                try {
                  console.log(
                    `📧 [BAA Email] Fetching admin and clinic staff email addresses...`,
                  );
                  const [adminEmails, clinicStaffEmails] = await Promise.all([
                    getAllAdminEmails(),
                    getAllClinicStaffEmails(),
                  ]);

                  console.log(
                    `📋 [BAA Email] Found ${adminEmails.length} admin email(s): ${adminEmails.join(", ")}`,
                  );
                  console.log(
                    `📋 [BAA Email] Found ${clinicStaffEmails.length} clinic staff email(s): ${clinicStaffEmails.join(", ")}`,
                  );

                  const baaData = {
                    baaId,
                    clinicName: details.clinicName || "Unknown Clinic",
                    providerEmail: details.email,
                    coveredEntityName: baa.coveredEntityName,
                    coveredEntityTitle: baa.coveredEntityTitle,
                    agreementStatus: values.status || "pending",
                    submittedDate: new Date().toISOString(),
                  };

                  // Send to admins with /admin dashboard URL
                  if (adminEmails.length > 0) {
                    console.log(
                      `📤 [BAA Email] Sending to ${adminEmails.length} admin(s): ${adminEmails.join(", ")}`,
                    );
                    await sendBaaAgreementNotification(adminEmails, {
                      ...baaData,
                      dashboardUrl: "/admin",
                    });
                    console.log(`✅ [BAA Email] Successfully sent to admins`);
                  }

                  // Send to clinic staff with / dashboard URL
                  if (clinicStaffEmails.length > 0) {
                    console.log(
                      `📤 [BAA Email] Sending to ${clinicStaffEmails.length} clinic staff: ${clinicStaffEmails.join(", ")}`,
                    );
                    await sendBaaAgreementNotification(clinicStaffEmails, {
                      ...baaData,
                      dashboardUrl: "/",
                    });
                    console.log(
                      `✅ [BAA Email] Successfully sent to clinic staff`,
                    );
                  }

                  if (
                    adminEmails.length === 0 &&
                    clinicStaffEmails.length === 0
                  ) {
                    console.warn(
                      "⚠️ [BAA Email] No admin or clinic staff emails found - skipping email notification",
                    );
                  }
                } catch (emailError) {
                  console.error(
                    "❌ [BAA Email] Failed to send BAA notification email:",
                    emailError,
                  );
                  if (emailError instanceof Error) {
                    console.error(
                      `❌ [BAA Email] Error details: ${emailError.message}`,
                    );
                    console.error(
                      `❌ [BAA Email] Stack trace:`,
                      emailError.stack,
                    );
                  }
                }
              })();
            }
          }

          notifyProviderAccountCreatedBestEffort({
            userId: existingAuthUser.id,
            providerAcctId,
            details,
            createdAt: new Date().toISOString(),
          });

          return { userId: existingAuthUser.id };
        }
      }

      throw mapped;
    }

    throw new HttpError(400, "Signup failed", {
      code: "SIGNUP_FAILED",
      details: message,
    });
  }

  const createdUserId = userData.user.id;

  let createdProviderAcctId: string | undefined;

  try {
    if (baa) {
      const inserted = await db
        .insert(providerAcct)
        .values({
          userId: createdUserId,
          ...details,
        })
        .returning({ id: providerAcct.id });

      const providerAcctId = inserted[0]?.id;
      createdProviderAcctId = providerAcctId;
      if (providerAcctId) {
        const baaId = crypto.randomUUID();

        let uploadedCovered: { bucket: string; key: string };
        try {
          uploadedCovered = await uploadBaaSignatureFromDataUrl({
            providerAcctId,
            baaId,
            type: "covered_entity",
            dataUrl: baa.coveredEntitySignature,
          });
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to upload signature";
          throw new HttpError(400, "Signup failed", {
            code: "BAA_SIGNATURE_UPLOAD_FAILED",
            details: msg,
          });
        }

        let businessKey: string | undefined;
        if (
          baa.businessAssociateSignature &&
          baa.businessAssociateSignature.trim()
        ) {
          try {
            ({ key: businessKey } = await uploadBaaSignatureFromDataUrl({
              providerAcctId,
              baaId,
              type: "business_associate",
              dataUrl: baa.businessAssociateSignature,
            }));
          } catch {
            businessKey = undefined;
          }
        }

        const values: typeof baaProvider.$inferInsert = {
          id: baaId,
          ...toBaaInsertValues(providerAcctId, baa),
          coveredEntitySignature: uploadedCovered.key,
          businessAssociateSignature: businessKey,
        };

        await db.insert(baaProvider).values(values);

        // Send email notifications to admins and clinic staff asynchronously
        console.log(
          `🔔 [BAA Email] Starting email notification process for BAA ID: ${baaId}`,
        );
        (async () => {
          try {
            console.log(
              `📧 [BAA Email] Fetching admin and clinic staff email addresses...`,
            );
            const [adminEmails, clinicStaffEmails] = await Promise.all([
              getAllAdminEmails(),
              getAllClinicStaffEmails(),
            ]);

            console.log(
              `📋 [BAA Email] Found ${adminEmails.length} admin email(s): ${adminEmails.join(", ")}`,
            );
            console.log(
              `📋 [BAA Email] Found ${clinicStaffEmails.length} clinic staff email(s): ${clinicStaffEmails.join(", ")}`,
            );

            const baaData = {
              baaId,
              clinicName: details.clinicName || "Unknown Clinic",
              providerEmail: details.email,
              coveredEntityName: baa.coveredEntityName,
              coveredEntityTitle: baa.coveredEntityTitle,
              agreementStatus: values.status || "pending",
              submittedDate: new Date().toISOString(),
            };

            // Send to admins with /admin dashboard URL
            if (adminEmails.length > 0) {
              console.log(
                `📤 [BAA Email] Sending to ${adminEmails.length} admin(s): ${adminEmails.join(", ")}`,
              );
              await sendBaaAgreementNotification(adminEmails, {
                ...baaData,
                dashboardUrl: "/admin",
              });
              console.log(`✅ [BAA Email] Successfully sent to admins`);
            }

            // Send to clinic staff with / dashboard URL
            if (clinicStaffEmails.length > 0) {
              console.log(
                `📤 [BAA Email] Sending to ${clinicStaffEmails.length} clinic staff: ${clinicStaffEmails.join(", ")}`,
              );
              await sendBaaAgreementNotification(clinicStaffEmails, {
                ...baaData,
                dashboardUrl: "/",
              });
              console.log(`✅ [BAA Email] Successfully sent to clinic staff`);
            }

            if (adminEmails.length === 0 && clinicStaffEmails.length === 0) {
              console.warn(
                "⚠️ [BAA Email] No admin or clinic staff emails found - skipping email notification",
              );
            }
          } catch (emailError) {
            console.error(
              "❌ [BAA Email] Failed to send BAA notification email:",
              emailError,
            );
            if (emailError instanceof Error) {
              console.error(
                `❌ [BAA Email] Error details: ${emailError.message}`,
              );
              console.error(`❌ [BAA Email] Stack trace:`, emailError.stack);
            }
          }
        })();
      }
    } else {
      const inserted = await db
        .insert(providerAcct)
        .values({
          userId: createdUserId,
          ...details,
        })
        .returning({ id: providerAcct.id });
      createdProviderAcctId = inserted[0]?.id;
    }
  } catch (e) {
    // Avoid leaving orphaned auth users that later cause "phone already registered".
    try {
      await supabase.auth.admin.deleteUser(createdUserId);
    } catch {
      // Best-effort cleanup.
    }

    // Best-effort cleanup of provider_acct if we created it but failed later.
    try {
      await db
        .delete(providerAcct)
        .where(eq(providerAcct.userId, createdUserId));
    } catch {
      // ignore
    }

    // If we hit a unique violation, treat it as a conflict not a server error.
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

  notifyProviderAccountCreatedBestEffort({
    userId: createdUserId,
    providerAcctId: createdProviderAcctId,
    details,
    createdAt: new Date().toISOString(),
  });

  return { userId: createdUserId };
}
