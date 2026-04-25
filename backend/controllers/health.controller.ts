import type { Request, Response } from "../http/types";

export function healthController(_req: Request, res: Response) {
  const appUrl = process.env.APP_URL || "not set";
  return res.json({
    status: "ok",
    appUrl,
    timestamp: new Date().toISOString(),
  });
}
