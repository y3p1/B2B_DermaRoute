import { POST } from "../../../app/api/rag/query/route";
import { callRoute } from "../nextApiTestUtils";

jest.mock("../../services/ragService", () => ({
  queryDocuments: jest.fn().mockResolvedValue({
    answer: "Based on the CMS policy, wound care coverage requires...",
    sources: [
      { file: "cms-lcd.pdf", excerpt: "Coverage for wound care products...", similarity: 0.92 },
    ],
  }),
}));

jest.mock("../../services/supabaseAdmin", () => ({
  getSupabaseAdminClient: jest.fn().mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com", user_metadata: {} } },
        error: null,
      }),
    },
  }),
}));

jest.mock("../../services/db", () => ({
  getDb: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }),
}));

describe("POST /api/rag/query", () => {
  it("returns 401 without auth token", async () => {
    const { res } = await callRoute(POST, {
      url: "http://localhost/api/rag/query",
      method: "POST",
      body: { question: "What does CMS cover?" },
    });
    expect(res.status).toBe(401);
  });

  it("returns answer and sources for valid query", async () => {
    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/rag/query",
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { question: "What does CMS cover for wound care?" },
    });
    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        answer: expect.any(String),
        sources: expect.any(Array),
      },
    });
  });

  it("returns 400 for missing question", async () => {
    const { res } = await callRoute(POST, {
      url: "http://localhost/api/rag/query",
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: {},
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty question string", async () => {
    const { res } = await callRoute(POST, {
      url: "http://localhost/api/rag/query",
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { question: "" },
    });
    expect(res.status).toBe(400);
  });
});
