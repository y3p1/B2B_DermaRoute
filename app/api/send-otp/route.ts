import { NextResponse } from "next/server";
import { isDemoMode } from "../../../lib/demoMode";
import { sendOtpController } from "../../../backend/controllers/otp.controller";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { otpSendAbuseGuard } from "../../../backend/middlewares/otpAbuseGuard";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 120 });
const sendGuard = otpSendAbuseGuard({
  windowMs: 10 * 60 * 1000,
  maxSends: 6,
  minIntervalMs: 20 * 1000,
});

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ success: true, demo: true });
  }

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, sendGuard],
    handler: sendOtpController,
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
