/**
 * POST /api/bv-forms/upload
 *
 * Accepts multipart/form-data with:
 *   - file      (PDF, required)
 *   - name      (string, required)
 *   - manufacturer (string, required)
 *   - description (string, optional)
 *
 * Uploads the PDF to Supabase Storage bucket "bv-forms" and creates a DB record.
 * Auth: admin or clinic_staff only.
 */
import {
  uploadBvFormFile,
  createBvForm,
} from "@/backend/services/bvForms.service";
import { corsMiddleware } from "@/backend/middlewares/cors";
import { errorHandler } from "@/backend/middlewares/errorHandler";
import { requireAuth } from "@/backend/middlewares/requireAuth";
import { requireAdminOrClinicStaff } from "@/backend/middlewares/requireAdminOrClinicStaff";
import { rateLimit } from "@/backend/middlewares/rateLimit";
import { getAllowedOrigins } from "@/backend/config/env";
import { runServerPipeline } from "@/backend/serverPipeline";

const cors = corsMiddleware({ allowedOrigins: getAllowedOrigins() });
const baseRateLimit = rateLimit({ windowMs: 60_000, max: 30 });

export async function POST(request: Request) {
  return runServerPipeline(request, {
    middlewares: [cors, baseRateLimit, requireAuth, requireAdminOrClinicStaff],
    handler: async (_req, res, next) => {
      try {
        const formData = await request.formData();

        const file = formData.get("file") as File | null;
        if (!file) {
          res.status(400).json({ success: false, error: "No file provided" });
          return next();
        }

        const name = (formData.get("name") as string | null)?.trim() ?? "";
        const manufacturer =
          (formData.get("manufacturer") as string | null)
            ?.trim()
            .toLowerCase() ?? "";
        const description =
          (formData.get("description") as string | null)?.trim() || undefined;
        const commercialRaw = formData.get("commercial") as string | null;
        const commercial =
          commercialRaw === "true"
            ? true
            : commercialRaw === "false"
              ? false
              : undefined;

        if (!name) {
          res
            .status(400)
            .json({ success: false, error: "Name is required" });
          return next();
        }
        if (!manufacturer) {
          res
            .status(400)
            .json({ success: false, error: "Manufacturer is required" });
          return next();
        }

        // Enforce PDF-only uploads
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          res
            .status(400)
            .json({ success: false, error: "Only PDF files are accepted" });
          return next();
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { path, size } = await uploadBvFormFile(
          manufacturer,
          file.name,
          buffer,
          "application/pdf",
        );

        const record = await createBvForm({
          name,
          manufacturer,
          description,
          filePath: path,
          fileName: file.name,
          fileSize: size,
          commercial,
        });

        res.status(201).json({ success: true, data: record });
        next();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        res.status(500).json({ success: false, error: message });
        next();
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
