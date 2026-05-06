import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { corsMiddleware } from "../../../../../../backend/middlewares/cors";
import { errorHandler } from "../../../../../../backend/middlewares/errorHandler";
import { requireAuth } from "../../../../../../backend/middlewares/requireAuth";
import { rateLimit } from "../../../../../../backend/middlewares/rateLimit";
import { getAllowedOrigins } from "../../../../../../backend/config/env";
import { runServerPipeline } from "../../../../../../backend/serverPipeline";
import { getProviderProfileByUserId } from "../../../../../../backend/services/bvRequests.service";
import { getSupabaseAdminClient } from "../../../../../../backend/services/supabaseAdmin";
import { getDb } from "../../../../../../backend/services/db";
import { bvRequests } from "../../../../../../db/bv-requests";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 20 });

const PROOF_BUCKET = "manufacturer-proofs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth],
    handler: async (_req, res, next) => {
      try {
        const userId = res.locals.userId as string | undefined;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const profile = await getProviderProfileByUserId(userId);
        if (!profile)
          return res.status(403).json({ error: "No provider profile found" });

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) return res.status(400).json({ error: "No file provided" });

        if (file.size > 5 * 1024 * 1024)
          return res.status(400).json({ error: "File exceeds 5MB limit" });

        const supabase = getSupabaseAdminClient();

        // Ensure the bucket exists (no-op if it already does)
        await supabase.storage
          .createBucket(PROOF_BUCKET, { public: false })
          .catch(() => {});

        const fileExt = file.name.split(".").pop() ?? "bin";
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
          .from(PROOF_BUCKET)
          .upload(fileName, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError)
          return res
            .status(500)
            .json({ error: `Upload failed: ${uploadError.message}` });

        const db = getDb();
        const [updated] = await db
          .update(bvRequests)
          .set({
            approvalProofUrl: fileName,
            proofStatus: "pending_review",
            updatedAt: new Date(),
          })
          .where(
            and(eq(bvRequests.id, id), eq(bvRequests.providerId, profile.id)),
          )
          .returning({
            id: bvRequests.id,
            proofStatus: bvRequests.proofStatus,
            approvalProofUrl: bvRequests.approvalProofUrl,
          });

        if (!updated)
          return res
            .status(404)
            .json({ error: "BV request not found or not owned by you" });

        return res.json({ success: true, data: updated });
      } catch (err) {
        return next(err);
      }
    },
    errorHandler,
  });
}

export async function OPTIONS(request: NextRequest) {
  return runServerPipeline(request, {
    middlewares: [cors],
    handler: (_req, res) => res.status(204).end(),
    errorHandler,
  });
}
