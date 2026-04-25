import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { providerAcct } from "../../db/provider";

export const updateProviderProfileSchema = z.object({
  accountPhone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  npiNumber: z.string().min(1).optional(),
  clinicName: z.string().min(1).optional(),
  clinicAddress: z.string().optional().nullable(),
  clinicPhone: z.string().optional().nullable(),
  providerSpecialty: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  groupNpi: z.string().optional().nullable(),
});

export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;

export async function updateProviderProfile(
  userId: string,
  data: UpdateProviderProfileInput,
) {
  const db = getDb();

  // Build update set — only include fields that are provided
  const updateSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.accountPhone !== undefined) updateSet.accountPhone = data.accountPhone;
  if (data.email !== undefined) updateSet.email = data.email;
  if (data.npiNumber !== undefined) updateSet.npiNumber = data.npiNumber;
  if (data.clinicName !== undefined) updateSet.clinicName = data.clinicName;
  if (data.clinicAddress !== undefined) updateSet.clinicAddress = data.clinicAddress;
  if (data.clinicPhone !== undefined) updateSet.clinicPhone = data.clinicPhone;
  if (data.providerSpecialty !== undefined) updateSet.providerSpecialty = data.providerSpecialty;
  if (data.taxId !== undefined) updateSet.taxId = data.taxId;
  if (data.groupNpi !== undefined) updateSet.groupNpi = data.groupNpi;

  const updated = await db
    .update(providerAcct)
    .set(updateSet)
    .where(eq(providerAcct.userId, userId))
    .returning({
      id: providerAcct.id,
      accountPhone: providerAcct.accountPhone,
      email: providerAcct.email,
      npiNumber: providerAcct.npiNumber,
      clinicName: providerAcct.clinicName,
      clinicAddress: providerAcct.clinicAddress,
      clinicPhone: providerAcct.clinicPhone,
      providerSpecialty: providerAcct.providerSpecialty,
      taxId: providerAcct.taxId,
      groupNpi: providerAcct.groupNpi,
      role: providerAcct.role,
      userId: providerAcct.userId,
      active: providerAcct.active,
      createdAt: providerAcct.createdAt,
      updatedAt: providerAcct.updatedAt,
    });

  return updated[0] ?? null;
}
