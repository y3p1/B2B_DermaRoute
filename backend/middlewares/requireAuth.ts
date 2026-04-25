import type { NextFunction, Request, Response } from "../http/types";

import { getSupabaseAdminClient } from "../services/supabaseAdmin";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Missing Authorization bearer token" });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  res.locals.userId = data.user.id;
  res.locals.accessToken = token;
  res.locals.user = data.user;

  return next();
}
