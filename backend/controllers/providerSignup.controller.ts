import type { Request, Response } from "../http/types";

import { z } from "zod";

import {
  type ClinicDetails,
  clinicDetailsSchema,
  providerSignup,
} from "../services/providerSignup.service";
import {
  baaSignatureSchema,
  type BaaSignatureInput,
} from "../services/baaProvider.service";
import { asyncHandler } from "../utils/asyncHandler";

const providerSignupRequestSchema = z.union([
  clinicDetailsSchema,
  z.object({
    clinic: clinicDetailsSchema,
    baa: baaSignatureSchema.optional(),
  }),
]);

type ProviderSignupRequest = z.infer<typeof providerSignupRequestSchema>;

export const providerSignupController = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = providerSignupRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const data: ProviderSignupRequest = parsed.data;
    const hasClinicWrapper =
      typeof data === "object" && data !== null && "clinic" in data;

    const clinic: ClinicDetails = hasClinicWrapper ? data.clinic : data;
    const baa: BaaSignatureInput | undefined = hasClinicWrapper
      ? data.baa
      : undefined;

    const result = await providerSignup(clinic, baa);
    return res.status(201).json({
      message: "Provider signup successful",
      user_id: result.userId,
      data: parsed.data,
    });
  },
);
