import type { Request, Response } from "../http/types";

import { asyncHandler } from "../utils/asyncHandler";
import {
  adminAccountCreateSchema,
  createAdminOrClinicStaffAccount,
} from "../services/adminAccountCreate.service";

export const adminAccountCreateController = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = adminAccountCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const result = await createAdminOrClinicStaffAccount({
      ...parsed.data,
      skipApproval: true, // Admin-created accounts are immediately active
    });

    return res.status(201).json({
      message: "Account created",
      user_id: result.userId,
    });
  },
);
