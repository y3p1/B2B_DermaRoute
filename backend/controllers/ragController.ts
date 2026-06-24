import type { Request, Response } from "../http/types";
import { z, ZodError } from "zod";
import {
  ingestDocument,
  queryDocuments,
  listDocuments,
  deleteDocument,
} from "../services/ragService";

const querySchema = z.object({
  question: z.string().min(1, "Question is required").max(2000, "Question too long"),
});

export async function ingestController(req: Request, res: Response) {
  try {
    const formData = req.body as FormData | undefined;
    if (!formData || typeof formData.get !== "function") {
      return res
        .status(400)
        .json({ success: false, error: "Expected multipart/form-data with a file field" });
    }

    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return res.status(400).json({ success: false, error: "Missing file field" });
    }

    const filename = file instanceof File ? file.name : "upload.pdf";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ success: false, error: "Only PDF files are accepted" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestDocument(buffer, filename);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function queryController(req: Request, res: Response) {
  try {
    const validated = querySchema.parse(req.body);
    const result = await queryDocuments(validated.question);
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ success: false, error: error.issues[0]?.message ?? "Validation error" });
    }
    const message = error instanceof Error ? error.message : "Query failed";
    if (message.includes("429") || message.includes("Too Many Requests")) {
      return res.status(429).json({
        success: false,
        error: "The AI service is temporarily rate-limited. Please wait a moment and try again.",
      });
    }
    if (
      message.includes("503") ||
      message.includes("Service Unavailable") ||
      message.includes("overloaded")
    ) {
      return res.status(503).json({
        success: false,
        error: "The AI service is experiencing high demand. Please try again in a moment.",
      });
    }
    return res.status(500).json({ success: false, error: message });
  }
}

export async function listDocumentsController(_req: Request, res: Response) {
  try {
    const documents = await listDocuments();
    return res.json({ success: true, data: documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list documents";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteDocumentController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/");
    const rawFilename = parts[parts.length - 1];
    if (!rawFilename) {
      return res.status(400).json({ success: false, error: "Missing filename" });
    }
    const filename = decodeURIComponent(rawFilename);
    await deleteDocument(filename);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return res.status(500).json({ success: false, error: message });
  }
}
