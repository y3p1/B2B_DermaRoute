import type {
  NextFunction,
  Request as HttpRequest,
  Response as HttpResponse,
} from "./http/types";

type HeadersObject = Record<string, string | undefined>;

type ExpressLikeRequest = HttpRequest;

type FinishListener = () => void;

type ExpressLikeResponse = HttpResponse & {
  headers: Map<string, string>;
  body: unknown;
  _emitFinish(): void;
};

function getHeader(req: Request, name: string): string | null {
  return req.headers.get(name);
}

function getClientIp(req: Request): string {
  const xff = getHeader(req, "x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = getHeader(req, "x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function toHeadersObject(headers: Headers): HeadersObject {
  const out: HeadersObject = {};
  for (const [key, value] of headers.entries()) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

async function parseBodyIfAny(req: Request): Promise<unknown> {
  const method = req.method.toUpperCase();
  if (
    method === "GET" ||
    method === "HEAD" ||
    method === "OPTIONS" ||
    method === "DELETE"
  )
    return undefined;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw new Error("Invalid JSON");
    }
  }

  return undefined;
}

function createExpressLike(
  req: Request,
  body: unknown,
  onFinish: () => void,
): { req: ExpressLikeRequest; res: ExpressLikeResponse } {
  const ip = getClientIp(req);

  const expressReq: ExpressLikeRequest = {
    method: req.method,
    headers: toHeadersObject(req.headers),
    ip,
    socket: { remoteAddress: ip },
    body,
    // Preserve the full request URL (path + query) so downstream handlers
    // can parse search params using `new URL(req.url, base)`.
    url: req.url,
  };

  const finishListeners: FinishListener[] = [];
  let finishEmitted = false;

  const safeFinish = () => {
    if (finishEmitted) return;
    finishEmitted = true;
    onFinish();
  };

  const expressRes: ExpressLikeResponse = {
    statusCode: 200,
    locals: {},
    finished: false,
    headers: new Map(),
    body: null,

    status(code: number) {
      expressRes.statusCode = code;
      return expressRes;
    },

    setHeader(name: string, value: string) {
      expressRes.headers.set(name, value);
      return expressRes;
    },

    json(value: unknown) {
      expressRes.body = value;
      expressRes.finished = true;
      if (!expressRes.headers.has("Content-Type")) {
        expressRes.headers.set(
          "Content-Type",
          "application/json; charset=utf-8",
        );
      }
      safeFinish();
      return expressRes;
    },

    end() {
      expressRes.finished = true;
      safeFinish();
      return expressRes;
    },

    on(event: "finish", listener: FinishListener) {
      if (event === "finish") finishListeners.push(listener);
    },

    _emitFinish() {
      for (const fn of finishListeners) {
        try {
          fn();
        } catch {
          // ignore
        }
      }
    },
  };

  return { req: expressReq, res: expressRes };
}

type Handler = (
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction,
) => unknown;

type RunOptions = {
  middlewares: Handler[];
  handler: Handler;
  errorHandler?: (
    err: unknown,
    req: HttpRequest,
    res: HttpResponse,
    next: NextFunction,
  ) => unknown;
};

export async function runServerPipeline(
  nextReq: Request,
  options: RunOptions,
): Promise<Response> {
  let body: unknown;
  try {
    body = await parseBodyIfAny(nextReq);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  let resolveFinished: (() => void) | null = null;
  const finishedPromise = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  const { req, res } = createExpressLike(nextReq, body, () => {
    resolveFinished?.();
  });

  const stack = [...options.middlewares, options.handler];

  let index = -1;

  const next: NextFunction = (err?: unknown) => {
    if (err) {
      if (options.errorHandler) {
        options.errorHandler(err, req, res, () => undefined);
        res.finished = true;
        resolveFinished?.();
      } else {
        res.statusCode = 500;
        res.json({ error: "Request failed" });
      }
      return;
    }

    index += 1;
    const fn = stack[index];
    if (!fn) {
      resolveFinished?.();
      return;
    }

    if (res.finished) return;

    try {
      const maybe = fn(req, res, next);
      if (maybe && typeof (maybe as Promise<unknown>).then === "function") {
        (maybe as Promise<unknown>).catch(next);
      }
    } catch (e) {
      next(e);
    }
  };

  next();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Request timed out")),
        15_000,
      );
    });

    await Promise.race([finishedPromise, timeoutPromise]);
  } catch {
    return new Response(JSON.stringify({ error: "Request timed out" }), {
      status: 504,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  res._emitFinish();

  const headers: Record<string, string> = {};
  for (const [k, v] of res.headers.entries()) headers[k] = v;

  const responseBody =
    res.body === null || res.body === undefined
      ? null
      : typeof res.body === "string"
        ? res.body
        : JSON.stringify(res.body);

  return new Response(responseBody, {
    status: res.statusCode,
    headers,
  });
}
