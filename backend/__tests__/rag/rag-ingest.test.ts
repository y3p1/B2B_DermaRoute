import { POST } from "../../../app/api/rag/ingest/route";
import { callRoute } from "../nextApiTestUtils";

jest.mock("../../services/ragService", () => ({
  ingestDocument: jest.fn().mockResolvedValue({ chunksCreated: 12 }),
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

// requireAdminOrClinicStaff queries DB for role verification
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

describe("POST /api/rag/ingest", () => {
  it("returns 401 without auth token", async () => {
    const { res } = await callRoute(POST, {
      url: "http://localhost/api/rag/ingest",
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided (JSON body instead of multipart)", async () => {
    const { res } = await callRoute(POST, {
      url: "http://localhost/api/rag/ingest",
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
      body: { notAFile: true },
    });
    // Body is JSON so req.body won't be FormData — controller returns 400
    expect(res.status).toBe(400);
  });
});
