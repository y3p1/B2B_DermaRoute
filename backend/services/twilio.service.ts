import twilio from "twilio";
import { getRequiredEnv } from "../config/env";
import { isDemoMode } from "../../lib/demoMode";

let cachedClient: ReturnType<typeof twilio> | undefined;

function getClient() {
  if (!cachedClient) {
    cachedClient = twilio(
      getRequiredEnv("TWILIO_ACCOUNT_SID"),
      getRequiredEnv("TWILIO_AUTH_TOKEN"),
    );
  }
  return cachedClient;
}

export async function sendOtpSms(phone: string): Promise<void> {
  if (isDemoMode()) {
    console.log("[DEMO] OTP SMS suppressed for", phone);
    return;
  }

  const client = getClient();
  const verifySid = getRequiredEnv("TWILIO_VERIFY_SID");

  await client.verify.v2.services(verifySid).verifications.create({
    to: phone,
    channel: "sms",
  });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (isDemoMode()) {
    console.log("[DEMO] OTP verify accepted for", phone, code);
    return true;
  }

  const client = getClient();
  const verifySid = getRequiredEnv("TWILIO_VERIFY_SID");

  const check = await client.verify.v2
    .services(verifySid)
    .verificationChecks.create({ to: phone, code });

  return check.status === "approved";
}

export async function sendAdminAlertSms(to: string, message: string): Promise<void> {
  if (isDemoMode()) {
    console.log("[DEMO] Admin alert SMS suppressed:", { to, message });
    return;
  }

  const client = getClient();
  const from = getRequiredEnv("TWILIO_PHONE_NUMBER");

  try {
    console.log(`[Twilio] Dispatching SMS Alert to ${to}...`);
    await client.messages.create({ body: message, from, to });
    console.log(`[Twilio] SMS Alert dispatched successfully`);
  } catch (error) {
    console.error(`[Twilio] Failed to dispatch SMS to ${to}:`, error);
    throw error;
  }
}
