import { clinicStaffSignupController } from "../../../backend/controllers/clinicStaffSignup.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
const signupLimit = rateLimit({ windowMs: 60_000, max: 10 });

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, signupLimit],
    handler: clinicStaffSignupController,
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
