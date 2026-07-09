import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { rateLimit } from "../../../backend/middlewares/rateLimit";
import { requireAuth } from "../../../backend/middlewares/requireAuth";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";
import { createClient } from "@supabase/supabase-js";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const limit = rateLimit({ windowMs: 60_000, max: 60 });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, limit, requireAuth],
    handler: async (req, res) => {
      const body = req.body as { bucket?: string; path?: string; expiresIn?: number };
      const { bucket, path, expiresIn } = body ?? {};

      if (!bucket || !path) {
        return res.status(400).json({ error: "Missing bucket or path" });
      }

      if (!supabaseUrl || !supabaseServiceRole) {
        return res
          .status(500)
          .json({ error: "Server not configured with SUPABASE keys" });
      }

      const supabaseServer = createClient(supabaseUrl, supabaseServiceRole);

      const { data, error } = await supabaseServer.storage
        .from(bucket)
        .createSignedUrl(
          path,
          typeof expiresIn === "number" ? expiresIn : 60 * 60 * 24 * 7,
        );

      if (error) {
        return res
          .status(500)
          .json({ error: error.message ?? String(error) });
      }

      return res.json({ signedUrl: data?.signedUrl ?? null });
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
