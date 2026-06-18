import { z } from "zod";
import type { Request, Response } from "../http/types";
import {
  listLymphedemaProducts,
  getLymphedemaProductById,
  createLymphedemaProduct,
  updateLymphedemaProduct,
  archiveLymphedemaProduct,
  lymphedemaProductSchema,
} from "../services/lymphedemaProducts.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listLymphedemaProductsController(
  req: Request,
  res: Response,
) {
  const url = new URL(req.url, "http://localhost");
  const includeArchived = url.searchParams.get("archived") === "true";
  const products = await listLymphedemaProducts(includeArchived);
  return res.json({ success: true, data: products });
}

export async function createLymphedemaProductController(
  req: Request,
  res: Response,
) {
  const parsed = lymphedemaProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const product = await createLymphedemaProduct(parsed.data);
  return res.status(201).json({ success: true, data: product });
}

export async function getLymphedemaProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const product = await getLymphedemaProductById(id);
  if (!product) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: product });
}

export async function updateLymphedemaProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const parsed = lymphedemaProductSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated = await updateLymphedemaProduct(id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: updated });
}

export async function archiveLymphedemaProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const archived = await archiveLymphedemaProduct(id);
  if (!archived) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: archived });
}
