import { GET as meGET } from "../../app/api/me/route";
import { GET as bvGET, POST as bvPOST } from "../../app/api/bv-requests/route";
import { callRoute } from "./nextApiTestUtils";

jest.mock("../services/supabaseAdmin", () => ({
  getSupabaseAdminClient: jest.fn(),
}));

jest.mock("../services/adminAcct.service", () => ({
  getAdminProfileByUserId: jest.fn(),
}));

jest.mock("../services/clinicStaffAcct.service", () => ({
  getClinicStaffProfileByUserId: jest.fn(),
}));

jest.mock("../services/bvRequests.service", () => {
  const actual = jest.requireActual("../services/bvRequests.service");
  return {
    ...actual,
    getProviderProfileByUserId: jest.fn(),
    listBvRequestsForProvider: jest.fn(),
    createBvRequest: jest.fn(),
  };
});

const { getSupabaseAdminClient } = jest.requireMock(
  "../services/supabaseAdmin",
) as {
  getSupabaseAdminClient: jest.Mock;
};

const {
  getProviderProfileByUserId,
  listBvRequestsForProvider,
  createBvRequest,
} = jest.requireMock("../services/bvRequests.service") as {
  getProviderProfileByUserId: jest.Mock;
  listBvRequestsForProvider: jest.Mock;
  createBvRequest: jest.Mock;
};

const { getAdminProfileByUserId } = jest.requireMock(
  "../services/adminAcct.service",
) as { getAdminProfileByUserId: jest.Mock };

const { getClinicStaffProfileByUserId } = jest.requireMock(
  "../services/clinicStaffAcct.service",
) as { getClinicStaffProfileByUserId: jest.Mock };

describe("Authenticated endpoints (/api/me, /api/bv-requests)", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    getAdminProfileByUserId.mockResolvedValue(null);
    getClinicStaffProfileByUserId.mockResolvedValue(null);

    getSupabaseAdminClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "u@example.com",
              phone: "+15551234567",
              user_metadata: { role: "provider" },
            },
          },
          error: null,
        }),
      },
    });

    getProviderProfileByUserId.mockResolvedValue({
      id: "prov-1",
      userId: "user-1",
      accountPhone: "+15551234567",
      email: "u@example.com",
      npiNumber: "1234567890",
      clinicName: "Test Clinic",
      clinicAddress: null,
      clinicPhone: null,
      providerSpecialty: null,
      taxId: null,
      groupNpi: null,
      role: "provider",
      active: true,
      createdAt: null,
      updatedAt: null,
    });
  });

  it("GET /api/me returns user + provider", async () => {
    const { res, json } = await callRoute(meGET, {
      url: "http://localhost/api/me",
      method: "GET",
      headers: { Authorization: "Bearer token" },
    });

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("success", true);
    expect(json.data).toHaveProperty("user.id", "user-1");
    expect(json.data).toHaveProperty("provider.id", "prov-1");
  });

  it("GET /api/bv-requests returns provider rows", async () => {
    listBvRequestsForProvider.mockResolvedValue([
      {
        id: 1,
        createdAt: null,
        status: "pending",
        provider: "Dr X",
        woundSize: "1cm",
        applicationDate: "2026-01-01",
        deliveryDate: "2026-01-02",
        practice: "Test Clinic",
      },
    ]);

    const { res, json } = await callRoute(bvGET, {
      url: "http://localhost/api/bv-requests",
      method: "GET",
      headers: { Authorization: "Bearer token" },
    });

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("success", true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data[0]).toHaveProperty("status", "pending");
  });

  it("POST /api/bv-requests validates payload and returns 400 on missing fields", async () => {
    const { res, json } = await callRoute(bvPOST, {
      url: "http://localhost/api/bv-requests",
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: { provider: "Dr X" },
    });

    expect(res.status).toBe(400);
    expect(json).toHaveProperty("error", "Validation failed");
  });

  it("POST /api/bv-requests creates a request", async () => {
    createBvRequest.mockResolvedValue({
      id: 123,
      createdAt: null,
      status: "pending",
    });

    const { res, json } = await callRoute(bvPOST, {
      url: "http://localhost/api/bv-requests",
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: {
        provider: "Dr X",
        placeOfService: "clinic",
        insurance: "aetna",
        woundType: "dfu",
        woundSize: "1cm",
        conservativeTherapy: true,
        diabetic: false,
        tunneling: false,
        infected: false,
        initials: "AB",
        applicationDate: "2026-01-01",
        deliveryDate: "2026-01-02",
      },
    });

    expect(res.status).toBe(201);
    expect(json).toHaveProperty("success", true);
    expect(json.data).toHaveProperty("id", 123);
  });
});
