import { POST } from "../../app/api/provider-signup/route";
import { callRoute } from "./nextApiTestUtils";

import { providerAcct } from "../../db/provider";
import { baaProvider } from "../../db/schema";

jest.mock("../services/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../services/supabaseAdmin", () => ({
  getSupabaseAdminClient: jest.fn(),
}));

jest.mock("../services/adminAcct.service", () => ({
  getAllAdminEmails: jest.fn().mockResolvedValue([]),
}));

jest.mock("../services/clinicStaffAcct.service", () => ({
  getAllClinicStaffEmails: jest.fn().mockResolvedValue([]),
}));

const { getDb } = jest.requireMock("../services/db") as {
  getDb: jest.Mock;
};

const { getSupabaseAdminClient } = jest.requireMock(
  "../services/supabaseAdmin",
) as {
  getSupabaseAdminClient: jest.Mock;
};

const { getAllAdminEmails } = jest.requireMock(
  "../services/adminAcct.service",
) as {
  getAllAdminEmails: jest.Mock;
};

const { getAllClinicStaffEmails } = jest.requireMock(
  "../services/clinicStaffAcct.service",
) as {
  getAllClinicStaffEmails: jest.Mock;
};

describe("POST /api/provider-signup", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    // resetAllMocks() clears mock implementations; keep a safe default so
    // background "best-effort" email notifications don't error during tests.
    getAllAdminEmails.mockResolvedValue([]);
    getAllClinicStaffEmails.mockResolvedValue([]);
  });

  it("returns 400 on validation error", async () => {
    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        // missing email, npiNumber, clinicName
      },
    });

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("error", "Validation failed");
    expect(json).toHaveProperty("details");
  });

  it("creates user and provider_acct", async () => {
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
        values: () => ({
          returning: async () => [{ id: "prov-1" }],
        }),
      }),
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        email: "test@example.com",
        npiNumber: "1234567890",
        clinicName: "Test Clinic",
      },
    });

    expect(res.status).toBe(201);
    expect(json).toHaveProperty("message", "Provider signup successful");
    expect(json).toHaveProperty("user_id", "user-1");
  });

  it("accepts BAA payload and inserts baa_provider", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
      },
      storage: {
        from: () => ({
          upload: jest.fn().mockResolvedValue({ error: null }),
        }),
      },
    });

    const baaValuesSpy = jest.fn();
    const insertMock = jest.fn((table: unknown) => {
      if (table === providerAcct) {
        return {
          values: () => ({
            returning: async () => [{ id: "prov-1" }],
          }),
        };
      }
      if (table === baaProvider) {
        return {
          values: async (values: unknown) => {
            baaValuesSpy(values);
            return undefined;
          },
        };
      }
      return {
        values: async () => undefined,
      };
    });

    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: insertMock,
    });

    const { res } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        clinic: {
          accountPhone: "+15551234567",
          email: "test@example.com",
          npiNumber: "1234567890",
          clinicName: "Test Clinic",
        },
        baa: {
          coveredEntity: "Test Covered Entity",
          coveredEntityName: "Jane Doe",
          coveredEntitySignature: "data:image/png;base64,AAA",
          coveredEntityTitle: "Mr",
          coveredEntityDate: "01/20/2026",
          agreementStatus: "Signed",
        },
      },
    });

    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalled();

    const insertedBaa = baaValuesSpy.mock.calls[0]?.[0] as
      | typeof baaProvider.$inferInsert
      | undefined;
    expect(insertedBaa).toBeTruthy();

    if (!insertedBaa) throw new Error("Expected baa_provider insert values");

    expect(typeof insertedBaa.coveredEntitySignature).toBe("string");
    expect(insertedBaa.coveredEntitySignature.startsWith("baa/provider/")).toBe(
      true,
    );
  });

  it("allows optional clinicPhone to be blank", async () => {
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
        values: () => ({
          returning: async () => [{ id: "prov-1" }],
        }),
      }),
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+639936841765",
        email: "jaymernfullstack@gmail.com",
        npiNumber: "1234567890",
        clinicName: "clinic name practice name two",
        clinicAddress: "",
        clinicPhone: "",
        providerSpecialty: "",
        taxId: "",
        groupNpi: "",
      },
    });

    expect(res.status).toBe(201);
    expect(json).toHaveProperty("message", "Provider signup successful");
    expect(json).toHaveProperty("user_id", "user-1");
  });

  it("allows optional clinicPhone to be null", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-2" } },
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
        values: () => ({
          returning: async () => [{ id: "prov-1" }],
        }),
      }),
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+639936841765",
        email: "jaymernfullstack@gmail.com",
        npiNumber: "1234567890",
        clinicName: "clinic name practice name two",
        clinicAddress: "",
        clinicPhone: null,
        providerSpecialty: "",
        taxId: "",
        groupNpi: "",
      },
    });

    expect(res.status).toBe(201);
    expect(json).toHaveProperty("message", "Provider signup successful");
    expect(json).toHaveProperty("user_id", "user-2");
  });

  it("returns 409 when email is already registered", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: {
              message:
                "A user with this email address has already been registered",
            },
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
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        email: "test@example.com",
        npiNumber: "1234567890",
        clinicName: "Test Clinic",
      },
    });

    expect(res.status).toBe(409);
    expect(json).toHaveProperty("error", "Email already registered");
    expect(json).toHaveProperty("code", "EMAIL_ALREADY_REGISTERED");
  });

  it("returns 409 when phone is already registered", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: {
              message: "Phone number already registered by another user",
            },
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
    });

    const { res, json } = await callRoute(POST, {
      url: "http://localhost/api/provider-signup",
      method: "POST",
      body: {
        accountPhone: "+15551234567",
        email: "test@example.com",
        npiNumber: "1234567890",
        clinicName: "Test Clinic",
      },
    });

    expect(res.status).toBe(409);
    expect(json).toHaveProperty("error", "Phone number already registered");
    expect(json).toHaveProperty("code", "PHONE_ALREADY_REGISTERED");
  });
});
