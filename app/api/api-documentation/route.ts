import { NextResponse } from "next/server";
import { corsMiddleware } from "../../../backend/middlewares/cors";
import { errorHandler } from "../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../backend/middlewares/requireAuth";
import { requireAdmin } from "../../../backend/middlewares/requireAdmin";
import { getAllowedOrigins } from "../../../backend/config/env";
import { runServerPipeline } from "../../../backend/serverPipeline";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });

export async function GET(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, requireAuth, requireAdmin],
    handler: async (_req, res) => {
      const docPath = path.join(process.cwd(), "API_DOCUMENTATION.md");
      try {
        const doc = await fs.readFile(docPath, "utf-8");
        return res.status(200).json({ content: doc });
      } catch {
        return res.status(404).json({ error: "API documentation not found." });
      }
    },
    errorHandler,
  });
}
