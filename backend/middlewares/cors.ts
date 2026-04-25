import type { NextFunction, Request, Response } from "../http/types";

type CorsOptions = {
  allowedOrigins: string[];
};

export function corsMiddleware(options: CorsOptions) {
  const allowed = new Set(options.allowedOrigins.filter(Boolean));

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowed.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  };
}
