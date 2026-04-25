import type { Request, Response } from "../http/types";
import {
  listBvForms,
  getBvFormById,
  createBvForm,
  updateBvForm,
  deleteBvForm,
  getSignedDownloadUrl,
  getBulkSignedDownloadUrls,
  createBvFormSchema,
  updateBvFormSchema,
} from "../services/bvForms.service";

// ────────────────────────────────────────────────────────────────────────────
// GET /api/bv-forms  – list all (optional ?manufacturer= or ?search= filter)
// ────────────────────────────────────────────────────────────────────────────
export async function listBvFormsController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const manufacturer = url.searchParams.get("manufacturer") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const commercialParam = url.searchParams.get("commercial");
    const commercial =
      commercialParam === "true"
        ? true
        : commercialParam === "false"
          ? false
          : undefined;

    const forms = await listBvForms({ manufacturer, search, commercial });
    return res.json({ success: true, data: forms });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list BV forms";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/bv-forms/:id  – get single record
// ────────────────────────────────────────────────────────────────────────────
export async function getBvFormController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const form = await getBvFormById(id);
    if (!form)
      return res
        .status(404)
        .json({ success: false, error: "BV form not found" });

    return res.json({ success: true, data: form });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get BV form";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/bv-forms  – create record only (metadata, no file)
// Use the upload route for combined file + record creation.
// ────────────────────────────────────────────────────────────────────────────
export async function createBvFormController(req: Request, res: Response) {
  try {
    const validated = createBvFormSchema.parse(req.body);
    const form = await createBvForm(validated);
    return res.status(201).json({ success: true, data: form });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return res.status(400).json({ success: false, error: err.message });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create BV form";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/bv-forms/:id  – update metadata
// ────────────────────────────────────────────────────────────────────────────
export async function updateBvFormController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const validated = updateBvFormSchema.parse(req.body);
    const form = await updateBvForm(id, validated);
    if (!form)
      return res
        .status(404)
        .json({ success: false, error: "BV form not found" });

    return res.json({ success: true, data: form });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return res.status(400).json({ success: false, error: err.message });
    }
    const message =
      err instanceof Error ? err.message : "Failed to update BV form";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/bv-forms/:id  – delete record + stored file
// ────────────────────────────────────────────────────────────────────────────
export async function deleteBvFormController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const deleted = await deleteBvForm(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, error: "BV form not found" });

    return res.json({ success: true, data: deleted });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete BV form";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/bv-forms/:id/download  – return a signed download URL
// ────────────────────────────────────────────────────────────────────────────
export async function getBvFormDownloadUrlController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    // Pathname: /api/bv-forms/{id}/download  → id is second-to-last segment
    const id = segments[segments.length - 2];
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const form = await getBvFormById(id);
    if (!form)
      return res
        .status(404)
        .json({ success: false, error: "BV form not found" });

    const signedUrl = await getSignedDownloadUrl(form.filePath);
    return res.json({ success: true, signedUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate signed URL";
    return res.status(500).json({ success: false, error: message });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/bv-forms/bulk-download
// Body: { ids: string[] }
// Returns signed download URLs for ALL requested form IDs in one DB + Storage call.
// ────────────────────────────────────────────────────────────────────────────
export async function getBulkDownloadUrlsController(
  req: Request,
  res: Response,
) {
  try {
    const body = req.body as { ids?: unknown };
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "ids must be a non-empty array" });
    }

    const stringIds = ids.filter((id): id is string => typeof id === "string");
    const results = await getBulkSignedDownloadUrls(stringIds);
    return res.json({ success: true, data: results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate signed URLs";
    return res.status(500).json({ success: false, error: message });
  }
}
