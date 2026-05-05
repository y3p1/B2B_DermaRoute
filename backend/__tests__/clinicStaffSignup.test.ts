import { POST } from "../../app/api/clinic-staff-signup/route";
import { callRoute } from "./nextApiTestUtils";

jest.mock("../services/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../services/supabaseAdmin", () => ({
  getSupabaseAdminClient: jest.fn(),
}));

const { getDb } = jest.requireMock("../services/db") as {
  getDb: jest.Mock;
};

const { getSupabaseAdminClient } = jest.requireMock(
  "../services/supabaseAdmin",
) as {
  getSupabaseAdminClient: jest.Mock;
};

describe("POST /api/clinic-staff-signup", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 400 on validation error", async () => {
    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/clinic-staff-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        // missing email, firstName, lastName
      },
    });

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("error", "Validation failed");
    expect(json).toHaveProperty("details");
  });

  it("creates user and clinic_staff_acct row", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
      },
    });

    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: async () => undefined,
      }),
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/clinic-staff-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        email: "staff@example.com",
        firstName: "Clinic",
        lastName: "Staff",
      },
    });

    expect(res.status).toBe(201);
    expect(json).toHaveProperty(
      "message",
      "Registration submitted. Your account is pending admin approval.",
    );
    expect(json).toHaveProperty("user_id", "user-1");
  });
});
