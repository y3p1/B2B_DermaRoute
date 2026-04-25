export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: unknown },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return (
    err instanceof HttpError ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: unknown }).name === "HttpError" &&
      "status" in err)
  );
}
