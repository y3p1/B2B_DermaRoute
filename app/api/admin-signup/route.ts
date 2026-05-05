import {
  createAdminOrClinicStaffAccount,
  adminAccountCreateSchema,
} from "../../../backend/services/adminAccountCreate.service";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
const signupLimit = rateLimit({ windowMs: 60_000, max: 10 });

// Reuse the adminAccountCreateSchema but omit role (we force role=admin)
const publicAdminSignupSchema = adminAccountCreateSchema.omit({ role: true });

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, signupLimit],
    handler: async (req, res) => {
      const parsed = publicAdminSignupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({
            error: "Validation failed",
            details: parsed.error.flatten(),
          });
      }

      const result = await createAdminOrClinicStaffAccount({
        ...parsed.data,
        role: "admin",
      });

      return res
        .status(201)
        .json({ message: "Admin signup successful", user_id: result.userId });
    },
    errorHandler,
  });
}

export async function OPTIONS(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors],
    handler: (_req, res) => res.status(204).end(),
    errorHandler,
  });
}
