import type { Request, Response } from "../http/types";
import {
  listAllRoutes,
  listRoutesForInsurance,
  createRoute,
  createRouteSchema,
  deleteRoute,
  bulkSetRoutes,
  bulkSetRoutesSchema,
  getManufacturersForInsurance,
} from "../services/insuranceRouting.service";

export async function listInsuranceRoutesController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, "http://localhost");
    const insuranceId = url.searchParams.get("insuranceId");

    const data = insuranceId
      ? await listRoutesForInsurance(insuranceId)
      : await listAllRoutes();

    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list routes";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createInsuranceRouteController(
  req: Request,
  res: Response,
) {
  try {
    const validated = createRouteSchema.parse(req.body);
    const route = await createRoute(validated);
    return res.status(201).json({ success: true, data: route });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create route";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteInsuranceRouteController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id) {
      return res.status(400).json({ success: false, error: "Missing ID" });
    }
    const route = await deleteRoute(id);
    if (!route) {
      return res.status(404).json({ success: false, error: "Route not found" });
    }
    return res.json({ success: true, data: route });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete route";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function bulkSetInsuranceRoutesController(
  req: Request,
  res: Response,
) {
  try {
    const validated = bulkSetRoutesSchema.parse(req.body);
    const routes = await bulkSetRoutes(validated);
    return res.json({ success: true, data: routes });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update routes";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function getManufacturersForInsuranceController(
  req: Request,
  res: Response,
) {
  try {
    const url = new URL(req.url, "http://localhost");
    const insuranceId = url.searchParams.get("insuranceId");
    if (!insuranceId) {
      return res
        .status(400)
        .json({ success: false, error: "insuranceId query parameter required" });
    }
    const data = await getManufacturersForInsurance(insuranceId);
    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get manufacturers for insurance";
    return res.status(500).json({ success: false, error: message });
  }
}
