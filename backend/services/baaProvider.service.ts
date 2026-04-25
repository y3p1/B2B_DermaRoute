import { z } from "zod";

import { baaProvider } from "../../db/schema";

export const baaSignatureSchema = z.object({
  coveredEntity: z.string().trim().min(1, "Covered Entity is required"),
  coveredEntityName: z.string().trim().min(1, "Name is required"),
  coveredEntitySignature: z
    .string()
    .trim()
    .min(1, "Covered Entity signature is required"),
  coveredEntityTitle: z.string().trim().min(1, "Title is required"),
  coveredEntityDate: z.string().trim().min(1, "Date is required"),

  businessAssociateName: z.string().trim().optional(),
  businessAssociateTitle: z.string().trim().optional(),
  businessAssociateDate: z.string().trim().optional(),
  businessAssociateSignature: z.string().trim().optional(),

  // Accept both the UI values and the DB enum values.
  agreementStatus: z
    .enum(["Pending", "Signed", "pending", "signed"])
    .optional(),
});

export type BaaSignatureInput = z.infer<typeof baaSignatureSchema>;

export type BaaStatus = "pending" | "signed";

export function mapAgreementStatusToBaaStatus(
  status: BaaSignatureInput["agreementStatus"],
): BaaStatus {
  if (!status) return "pending";
  if (status === "Signed" || status === "signed") return "signed";
  return "pending";
}

export function toBaaInsertValues(
  providerAcctId: string,
  input: BaaSignatureInput,
) {
  return {
    providerAcctId,
    coveredEntity: input.coveredEntity,
    coveredEntityName: input.coveredEntityName,
    coveredEntityTitle: input.coveredEntityTitle,
    coveredEntityDate: input.coveredEntityDate,
    coveredEntitySignature: input.coveredEntitySignature,

    businessAssociateName: input.businessAssociateName,
    businessAssociateTitle: input.businessAssociateTitle,
    businessAssociateDate: input.businessAssociateDate,
    businessAssociateSignature: input.businessAssociateSignature,

    status: mapAgreementStatusToBaaStatus(input.agreementStatus),
    updatedAt: new Date(),
  } satisfies typeof baaProvider.$inferInsert;
}
