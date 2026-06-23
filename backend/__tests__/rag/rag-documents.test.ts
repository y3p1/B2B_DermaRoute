import { GET } from "../../../app/api/rag/documents/route";
import { DELETE } from "../../../app/api/rag/documents/[filename]/route";
import { callRoute } from "../nextApiTestUtils";

jest.mock("../../services/ragService", () => ({
  listDocuments: jest.fn().mockResolvedValue([
    { sourceFile: "cms-policy.pdf", chunkCount: 15, ingestedAt: "2025-01-01T00:00:00Z" },
    { sourceFile: "lcd-wound.pdf", chunkCount: 8, ingestedAt: "2025-01-02T00:00:00Z" },
  ]),
  deleteDocument: jest.fn().mockResolvedValue(undefined),
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
          limit: jest.fn().mockResolvedValue([{ id: "acct-1", role: "admin", active: true }]),
        }),
      }),
    }),
  }),
}));

describe("GET /api/rag/documents", () => {
  it("returns 401 without auth token", async () => {
    const { res } = await callRoute(GET, {
      url: "http://localhost/api/rag/documents",
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("returns document list for authorized user", async () => {
    const { res, json } = await callRoute(GET, {
      url: "http://localhost/api/rag/documents",
      method: "GET",
      headers: { authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({ sourceFile: "cms-policy.pdf", chunkCount: 15 }),
      ]),
    });
  });
});

describe("DELETE /api/rag/documents/[filename]", () => {
  it("returns 401 without auth token", async () => {
    const { res } = await callRoute(DELETE, {
      url: "http://localhost/api/rag/documents/cms-policy.pdf",
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("deletes document for admin user", async () => {
    const { res, json } = await callRoute(DELETE, {
      url: "http://localhost/api/rag/documents/cms-policy.pdf",
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
  });
});
