import { assertLlmBudget } from "../../services/llmBudget";
import { isHttpError } from "../../utils/httpError";

const execute = jest.fn();

jest.mock("../../services/db", () => ({
  getDb: jest.fn(() => ({ execute })),
}));

describe("assertLlmBudget", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("passes when the running daily total is within budget", async () => {
    process.env.GEMINI_DAILY_CALL_BUDGET = "2000";
    execute.mockResolvedValue([{ call_count: 5 }]);

    await expect(assertLlmBudget(1)).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("throws HttpError(429) once the total exceeds budget", async () => {
    process.env.GEMINI_DAILY_CALL_BUDGET = "10";
    execute.mockResolvedValue([{ call_count: 11 }]);

    await expect(assertLlmBudget(1)).rejects.toThrow(/daily ai usage limit/i);
    try {
      await assertLlmBudget(1);
      fail("expected HttpError");
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      if (isHttpError(err)) {
        expect(err.status).toBe(429);
        expect(err.code).toBe("LLM_DAILY_BUDGET_EXCEEDED");
      }
    }
  });

  it("is disabled (no DB call) when budget <= 0", async () => {
    process.env.GEMINI_DAILY_CALL_BUDGET = "0";

    await expect(assertLlmBudget(5)).resolves.toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
  });

  it("defaults to a 2000/day cap when the env var is unset", async () => {
    delete process.env.GEMINI_DAILY_CALL_BUDGET;
    execute.mockResolvedValue([{ call_count: 2001 }]);

    await expect(assertLlmBudget(1)).rejects.toThrow(/daily ai usage limit/i);
  });
});
