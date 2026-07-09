import type { NextFunction, Request, Response } from "../http/types";
import { ZodError } from "zod";
import { isHttpError } from "../utils/httpError";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.flatten(),
    });
  }

  if (isHttpError(err)) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : null),
      ...(err.details !== undefined ? { details: err.details } : null),
    });
  }

  if (err instanceof Error) {
    console.error("[ErrorHandler] Critical Error:", err);
    return res.status(500).json({ error: "Request failed" });
  }

  console.error("[ErrorHandler] Unknown Error:", err);
  return res.status(500).json({ error: "Request failed" });
}
