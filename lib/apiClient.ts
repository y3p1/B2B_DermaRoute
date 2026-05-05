import { isClientDemoMode, DEMO_ROLE_COOKIE } from "@/lib/demoMode";

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type Json =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as Json;
  } catch {
    return text;
  }
}

function getDemoCookieRole(): string {
  if (typeof document === "undefined") return "provider";
  const match = document.cookie.split(";").find((c) =>
    c.trim().startsWith(`${DEMO_ROLE_COOKIE}=`),
  );
  return match ? decodeURIComponent(match.trim().slice(DEMO_ROLE_COOKIE.length + 1)) : "provider";
}

function demoHeaders(): Record<string, string> {
  if (!isClientDemoMode()) return {};
  return {
    Authorization: "Bearer demo-token",
    "X-Demo-Role": getDemoCookieRole(),
  };
}

type RequestOptions = {
  token?: string;
};

export async function apiGet<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const res = await fetch(path, {
    method: "GET",
    headers: {
      ...demoHeaders(),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const message =
      (typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined) || `Request failed (${res.status})`;

    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

export async function apiPost<TResponse, TBody extends Json>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...demoHeaders(),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const message =
      (typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined) || `Request failed (${res.status})`;

    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

export async function apiPatch<TResponse, TBody extends Json>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TResponse> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...demoHeaders(),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const message =
      (typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined) || `Request failed (${res.status})`;

    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

export async function apiDelete<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: {
      ...demoHeaders(),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const message =
      (typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : undefined) || `Request failed (${res.status})`;

    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}
