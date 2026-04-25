import { verifyOtpController } from "../../../backend/controllers/otp.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { otpVerifyAbuseGuard } from "../../../backend/middlewares/otpAbuseGuard";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
const verifyGuard = otpVerifyAbuseGuard({
  maxFailures: 3,
  lockMs: 10 * 60 * 1000,
});

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, verifyGuard],
    handler: verifyOtpController,
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
