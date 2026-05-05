import { NextResponse } from "next/server";
import { isDemoMode } from "../../../../lib/demoMode";
import { corsMiddleware } from "../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../../backend/middlewares/requireAdmin";
import { getAllowedOrigins } from "../../../../backend/config/env";
import { runServerPipeline } from "../../../../backend/serverPipeline";

export const dynamic = "force-dynamic";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return new NextResponse("Not available outside demo mode", { status: 404 });
  }

  return runServerPipeline(request, {
    middlewares: [cors, requireAuth, requireAdmin],
    handler: async (_req, res) => {
      try {
        const { runDemoReset } = await import("../../../../scripts/demo/resetDemo");
        const result = await runDemoReset();
        return res.json({ success: true, ...result });
      } catch (err) {
        console.error("Demo reset failed", err);
        return res.status(500).json({ success: false, error: String(err) });
      }
    },
    errorHandler,
  });
}
