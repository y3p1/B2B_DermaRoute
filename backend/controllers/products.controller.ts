import type { Request, Response } from "../http/types";
import { ZodError } from "zod";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
} from "../services/products.service";

/**
 * Sanitize error messages to prevent SQL/internal error leakage (OWASP).
 */
function sanitizeProductError(error: unknown): string {
  if (error instanceof ZodError) {
    // Extract user-friendly Zod validation messages
    const messages = error.issues.map((issue) => issue.message);
    return messages.join("; ");
  }

  // Never expose raw SQL/Postgres errors to the client
  const raw = error instanceof Error ? error.message : "";
  if (
    raw.includes("invalid input syntax") ||
    raw.includes("numeric field overflow") ||
    raw.includes("violates") ||
    raw.includes("syntax error") ||
    raw.includes("relation ") ||
    raw.includes("column ")
  ) {
    return "Invalid input. Please ensure all price fields contain only numbers with up to 2 decimal places (e.g., 127.14).";
  }

  return raw || "An unexpected error occurred.";
}

export async function listProductsController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const commercialParam = url.searchParams.get("commercial");
    const filters: { commercial?: boolean } = {};
    if (commercialParam === "true") filters.commercial = true;
    else if (commercialParam === "false") filters.commercial = false;

    const products = await listProducts(filters);
    return res.json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, error: sanitizeProductError(error) });
  }
}

export async function getProductController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const product = await getProductById(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, error: sanitizeProductError(error) });
  }
}

export async function createProductController(req: Request, res: Response) {
  try {
    const validated = createProductSchema.parse(req.body);
    const product = await createProduct(validated);
    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: sanitizeProductError(error) });
    }
    return res.status(500).json({ success: false, error: sanitizeProductError(error) });
  }
}

export async function updateProductController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const validated = updateProductSchema.parse(req.body);
    const product = await updateProduct(id, validated);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: sanitizeProductError(error) });
    }
    return res.status(500).json({ success: false, error: sanitizeProductError(error) });
  }
}

export async function deleteProductController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const product = await deleteProduct(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    return res.json({
      success: true,
      data: product,
      message: "Product permanently deleted."
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: sanitizeProductError(error) });
  }
}
