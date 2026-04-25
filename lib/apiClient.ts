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
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : null),
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
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : null),
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
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : null),
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
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : null),
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
