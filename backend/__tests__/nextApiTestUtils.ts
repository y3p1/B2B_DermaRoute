type CallRouteOptions = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export async function callRoute(
  handler: (req: Request) => Promise<Response> | Response,
  options: CallRouteOptions,
): Promise<{ res: Response; json: any; text: string }> {
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  const init: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body !== undefined) {
    if (!headers["content-type"] && !headers["Content-Type"]) {
      headers["content-type"] = "application/json";
    }
    init.body = JSON.stringify(options.body);
  }

  const req = new Request(options.url, init);
  const res = await handler(req);

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { res, json, text };
}
