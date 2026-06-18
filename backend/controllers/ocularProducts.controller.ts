import type { Request, Response } from "../http/types";
import {
  listOcularProducts,
  getOcularProductById,
  createOcularProduct,
  updateOcularProduct,
  archiveOcularProduct,
  ocularProductSchema,
} from "../services/ocularProducts.service";

function getLastPathSegment(url: string): string | null {
  const parts = (url || "").split("?")[0].split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function listOcularProductsController(
  req: Request,
  res: Response,
) {
  const url = new URL(req.url, "http://localhost");
  const includeArchived = url.searchParams.get("archived") === "true";
  const products = await listOcularProducts(includeArchived);
  return res.json({ success: true, data: products });
}

export async function createOcularProductController(
  req: Request,
  res: Response,
) {
  const parsed = ocularProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const product = await createOcularProduct(parsed.data);
  return res.status(201).json({ success: true, data: product });
}

export async function getOcularProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const product = await getOcularProductById(id);
  if (!product) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: product });
}

export async function updateOcularProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const parsed = ocularProductSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated = await updateOcularProduct(id, parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: updated });
}

export async function archiveOcularProductController(
  req: Request,
  res: Response,
) {
  const id = getLastPathSegment(req.url);
  if (!id) return res.status(400).json({ error: "id required" });

  const archived = await archiveOcularProduct(id);
  if (!archived) return res.status(404).json({ error: "Not found" });

  return res.json({ success: true, data: archived });
}
