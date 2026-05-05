import type { Request, Response } from "../http/types";
import {
  listManufacturers,
  getManufacturerById,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  createManufacturerSchema,
  updateManufacturerSchema,
} from "../services/manufacturers.service";
import { isHttpError } from "../utils/httpError";

export async function listManufacturersController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const commercialParam = url.searchParams.get("commercial");
    const filters: { commercial?: boolean } = {};
    if (commercialParam === "true") filters.commercial = true;
    else if (commercialParam === "false") filters.commercial = false;

    const manufacturers = await listManufacturers(filters);
    return res.json({ success: true, data: manufacturers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list manufacturers";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function getManufacturerController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const manufacturer = await getManufacturerById(id);

    if (!manufacturer) {
      return res
        .status(404)
        .json({ success: false, error: "Manufacturer not found" });
    }

    return res.json({ success: true, data: manufacturer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get manufacturer";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createManufacturerController(
  req: Request,
  res: Response,
) {
  try {
    const validated = createManufacturerSchema.parse(req.body);
    const manufacturer = await createManufacturer(validated);
    return res.status(201).json({ success: true, data: manufacturer });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create manufacturer";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function updateManufacturerController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const validated = updateManufacturerSchema.parse(req.body);
    const manufacturer = await updateManufacturer(id, validated);

    if (!manufacturer) {
      return res
        .status(404)
        .json({ success: false, error: "Manufacturer not found" });
    }

    return res.json({ success: true, data: manufacturer });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update manufacturer";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteManufacturerController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, `http://localhost`);
    const id = url.pathname.split("/").pop();

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }

    const manufacturer = await deleteManufacturer(id);

    if (!manufacturer) {
      return res
        .status(404)
        .json({ success: false, error: "Manufacturer not found" });
    }

    return res.json({ success: true, data: manufacturer });
  } catch (error) {
    if (isHttpError(error)) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: "Failed to delete manufacturer" });
  }
}
