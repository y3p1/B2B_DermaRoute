export type NextFunction = (err?: unknown) => void;

export type Request = {
  method: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  ip?: string;
  socket: { remoteAddress?: string };
  url: string;
};

export type FinishListener = () => void;

export type Response = {
  statusCode: number;
  locals: Record<string, unknown>;
  finished: boolean;

  status(code: number): Response;
  setHeader(name: string, value: string): Response;
  json(value: unknown): Response;
  end(): Response;
  on(event: "finish", listener: FinishListener): void;
};
