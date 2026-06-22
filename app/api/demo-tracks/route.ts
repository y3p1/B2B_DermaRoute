import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";
import { isDemoMode, DEMO_ROLE_TRACKS } from "../../../lib/demoMode";
import { getAllDemoProviderTracks } from "../../../backend/services/demoTracks.service";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 30 });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit],
    handler: async (_req, res) => {
      if (!isDemoMode()) {
        return res.status(404).json({ error: "Not found" });
      }

      try {
        const dbTracks = await getAllDemoProviderTracks();

        // Merge with hardcoded defaults — DB values take precedence
        const merged: Record<string, string[]> = {
          provider: DEMO_ROLE_TRACKS.provider,
          provider_wound2: DEMO_ROLE_TRACKS.provider_wound2,
          provider_ocular: DEMO_ROLE_TRACKS.provider_ocular,
          ...dbTracks,
        };

        return res.json({ success: true, data: merged });
      } catch {
        // Fall back to hardcoded tracks if DB is unavailable
        return res.json({
          success: true,
          data: {
            provider: DEMO_ROLE_TRACKS.provider,
            provider_wound2: DEMO_ROLE_TRACKS.provider_wound2,
            provider_ocular: DEMO_ROLE_TRACKS.provider_ocular,
          },
        });
      }
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
