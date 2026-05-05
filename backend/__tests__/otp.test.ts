import { POST as sendOtpPOST } from "../../app/api/send-otp/route";
import { POST as verifyOtpPOST } from "../../app/api/verify-otp/route";
import { __resetOtpAbuseGuardsForTests } from "../middlewares/otpAbuseGuard";
import { callRoute } from "./nextApiTestUtils";

jest.mock("../services/db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../services/supabaseAdmin", () => ({
  getSupabaseAdminClient: jest.fn(),
}));

jest.mock("../services/twilio.service", () => ({
  sendOtpSms: jest.fn(),
  verifyOtp: jest.fn(),
}));

const { getDb } = jest.requireMock("../services/db") as {
  getDb: jest.Mock;
};

const { getSupabaseAdminClient } = jest.requireMock(
  "../services/supabaseAdmin",
) as {
  getSupabaseAdminClient: jest.Mock;
};

const { sendOtpSms, verifyOtp } = jest.requireMock(
  "../services/twilio.service",
) as {
  sendOtpSms: jest.Mock;
  verifyOtp: jest.Mock;
};

const isDemo = process.env.DEMO_MODE === "true";

(isDemo ? describe.skip : describe)("OTP endpoints", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    __resetOtpAbuseGuardsForTests();
  });

  it("POST /api/send-otp returns 400 if missing phone", async () => {
    const { res, json } = await callRoute(sendOtpPOST, {
      url: "http://localhost/api/send-otp",
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(400);
    expect(json).toHaveProperty("error");
  });

  it("POST /api/send-otp (signin) returns 404 if phone not registered", async () => {
    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    });

    const { res, json } = await callRoute(sendOtpPOST, {
      url: "http://localhost/api/send-otp",
      method: "POST",
      body: { phone: "+15551234567", mode: "signin" },
    });

    expect(res.status).toBe(404);
    expect(json).toHaveProperty("error", "Phone is not registered");
  });

  it("POST /api/send-otp (signup) uses Twilio verify and returns success", async () => {
    sendOtpSms.mockResolvedValue(undefined);

    const { res, json } = await callRoute(sendOtpPOST, {
      url: "http://localhost/api/send-otp",
      method: "POST",
      body: { phone: "+15551234567", mode: "signup" },
    });

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(sendOtpSms).toHaveBeenCalled();
  });

  it("POST /api/send-otp (signup) returns 429 with friendly message when Twilio is rate-limiting", async () => {
    sendOtpSms.mockRejectedValue({
      code: 60203,
      status: 429,
      message: "Max send attempts reached",
    });

    const { res, json } = await callRoute(sendOtpPOST, {
      url: "http://localhost/api/send-otp",
      method: "POST",
      body: { phone: "+15551234567", mode: "signup" },
    });

    expect(res.status).toBe(429);
    expect(json).toHaveProperty(
      "error",
      "Rate limited: max OTP send attempts reached. Try again after 10 minutes.",
    );
  });

  it("POST /api/send-otp (signup) returns structured guidance when Twilio Fraud Guard blocks a number (60410)", async () => {
    sendOtpSms.mockRejectedValue({
      code: 60410,
      status: 403,
      message:
        "The destination phone number has been temporarily blocked by Twilio due to fraudulent activities. More information: https://www.twilio.com/docs/errors/60410",
    });

    const { res, json } = await callRoute(sendOtpPOST, {
      url: "http://localhost/api/send-otp",
      method: "POST",
      body: { phone: "+15551234567", mode: "signup" },
    });

    expect(res.status).toBe(429);
    expect(json).toHaveProperty("code", "TWILIO_VERIFY_BLOCKED");
    expect(json).toHaveProperty("provider", "twilio");
    expect(json).toHaveProperty("providerCode", 60410);
    expect(json).toHaveProperty(
      "helpUrl",
      "https://www.twilio.com/docs/errors/60410",
    );
    expect(json).toHaveProperty("details");
    expect(json).toHaveProperty("nextSteps");
  });

  it("POST /api/verify-otp (signup) returns success when Twilio verifies", async () => {
    verifyOtp.mockResolvedValue(true);

    const { res, json } = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: { phone: "+15551234567", code: "123456", mode: "signup" },
    });

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
  });

  it("POST /api/verify-otp (signup) returns 429 with friendly message when Twilio blocks verification attempts", async () => {
    verifyOtp.mockRejectedValue({
      code: 60202,
      status: 429,
      message: "Max check attempts reached",
    });

    const { res, json } = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: { phone: "+15551234567", code: "123456", mode: "signup" },
    });

    expect(res.status).toBe(429);
    expect(json).toHaveProperty(
      "error",
      "Rate limited: too many OTP verification attempts. Try again after 10 minutes.",
    );
  });

  it("POST /api/verify-otp (signin) returns session when Supabase verifies and provider profile exists", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        verifyOtp: jest.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
            session: { access_token: "at", refresh_token: "rt" },
          },
          error: null,
        }),
      },
    });

    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: "prov-1" }],
          }),
        }),
      }),
    });

    const { res, json } = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: { phone: "+15551234567", code: "123456", mode: "signin" },
    });

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("success", true);
    expect(json.data).toHaveProperty("session");
  });

  it("POST /api/verify-otp (signin) blocks after 3 failed attempts", async () => {
    getSupabaseAdminClient.mockReturnValue({
      auth: {
        verifyOtp: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid or expired code" },
        }),
      },
    });

    const payload = { phone: "+15551234567", code: "000000", mode: "signin" };

    const r1 = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: payload,
    });
    const r2 = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: payload,
    });
    const r3 = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: payload,
    });
    const r4 = await callRoute(verifyOtpPOST, {
      url: "http://localhost/api/verify-otp",
      method: "POST",
      body: payload,
    });

    expect(r1.res.status).toBe(400);
    expect(r2.res.status).toBe(400);
    expect(r3.res.status).toBe(400);
    expect(r4.res.status).toBe(429);
    expect(r4.res.headers.get("retry-after")).toBeTruthy();
    expect(r4.json).toHaveProperty("retryAfterSeconds");
  });
});
