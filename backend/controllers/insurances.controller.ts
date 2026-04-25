import type { Request, Response } from "../http/types";
import {
  listInsurances,
  getInsuranceById,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  createInsuranceSchema,
  updateInsuranceSchema,
} from "../services/insurances.service";

type PostgresErrorLike = {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
  constraint_name?: unknown;
  table_name?: unknown;
  column_name?: unknown;
  schema_name?: unknown;
  cause?: unknown;
};

function findPostgresErrorLike(
  err: unknown,
  depth = 0,
): PostgresErrorLike | null {
  if (!err || typeof err !== "object") return null;
  const maybe = err as PostgresErrorLike;
  if (typeof maybe.code === "string") return maybe;
  if (depth >= 5) return null;
  if ("cause" in maybe) return findPostgresErrorLike(maybe.cause, depth + 1);
  return null;
}

export async function listInsurancesController(_req: Request, res: Response) {
  try {
    const data = await listInsurances();
    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list insurances";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function getInsuranceController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const insurance = await getInsuranceById(id);
    if (!insurance)
      return res
        .status(404)
        .json({ success: false, error: "Insurance not found" });

    return res.json({ success: true, data: insurance });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get insurance";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function createInsuranceController(req: Request, res: Response) {
  try {
    const validated = createInsuranceSchema.parse(req.body);
    const insurance = await createInsurance(validated);
    return res.status(201).json({ success: true, data: insurance });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }

    const pg = findPostgresErrorLike(error);
    if (pg && typeof pg.code === "string") {
      // Unique violation
      if (pg.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "Insurance already exists",
          details: {
            code: pg.code,
            constraint:
              typeof pg.constraint_name === "string"
                ? pg.constraint_name
                : null,
          },
        });
      }

      // Surface the underlying Postgres cause (useful for debugging staging env mismatches)
      return res.status(500).json({
        success: false,
        error: "Failed to create insurance",
        details: {
          code: pg.code,
          message: typeof pg.message === "string" ? pg.message : null,
          detail: typeof pg.detail === "string" ? pg.detail : null,
          constraint:
            typeof pg.constraint_name === "string" ? pg.constraint_name : null,
          table: typeof pg.table_name === "string" ? pg.table_name : null,
          column: typeof pg.column_name === "string" ? pg.column_name : null,
          schema: typeof pg.schema_name === "string" ? pg.schema_name : null,
        },
      });
    }

    const message =
      error instanceof Error ? error.message : "Failed to create insurance";
    return res
      .status(500)
      .json({
        success: false,
        error: "Failed to create insurance",
        details: message,
      });
  }
}

export async function updateInsuranceController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const validated = updateInsuranceSchema.parse(req.body);
    const insurance = await updateInsurance(id, validated);
    if (!insurance)
      return res
        .status(404)
        .json({ success: false, error: "Insurance not found" });

    return res.json({ success: true, data: insurance });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update insurance";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function deleteInsuranceController(req: Request, res: Response) {
  try {
    const url = new URL(req.url, "http://localhost");
    const id = url.pathname.split("/").pop();
    if (!id)
      return res.status(400).json({ success: false, error: "Missing ID" });

    const insurance = await deleteInsurance(id);
    if (!insurance)
      return res
        .status(404)
        .json({ success: false, error: "Insurance not found" });

    return res.json({ success: true, data: insurance });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete insurance";
    return res.status(500).json({ success: false, error: message });
  }
}
