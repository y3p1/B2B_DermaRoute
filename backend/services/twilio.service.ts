import twilio from "twilio";
import { getRequiredEnv } from "../config/env";

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
  const client = getClient();
  const verifySid = getRequiredEnv("TWILIO_VERIFY_SID");

  // Debug: Log credentials (remove after testing)
  console.log("Twilio Debug:", {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + "...",
    authToken: process.env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET",
    verifySid: verifySid.substring(0, 10) + "...",
  });

  await client.verify.v2.services(verifySid).verifications.create({
    to: phone,
    channel: "sms",
  });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const client = getClient();
  const verifySid = getRequiredEnv("TWILIO_VERIFY_SID");

  const check = await client.verify.v2
    .services(verifySid)
    .verificationChecks.create({ to: phone, code });

  return check.status === "approved";
}

/**
 * Sends a generic SMS alert to an admin phone number
 */
export async function sendAdminAlertSms(to: string, message: string): Promise<void> {
  const client = getClient();
  const from = getRequiredEnv("TWILIO_PHONE_NUMBER");

  try {
    console.log(`[Twilio] Dispatching SMS Alert to ${to}...`);
    await client.messages.create({
      body: message,
      from,
      to,
    });
    console.log(`[Twilio] SMS Alert dispatched successfully`);
  } catch (error) {
    console.error(`[Twilio] Failed to dispatch SMS to ${to}:`, error);
    throw error;
  }
}
