import sgMail, { MailDataRequired } from "@sendgrid/mail";
import { isDemoMode } from "../../lib/demoMode";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY is not set in environment variables");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams) {
  if (isDemoMode()) {
    console.log("[DEMO] Email suppressed:", { to: params.to, subject: params.subject });
    return { success: true, messageId: "demo-noop", statusCode: 202 };
  }

  if (!SENDGRID_API_KEY) {
    throw new Error("SendGrid API key is not configured");
  }

  const { to, subject, text, html, from } = params;

  const msg: MailDataRequired = {
    to,
    from:
      from || process.env.SENDGRID_FROM_EMAIL || "noreply@integritytissue.com",
    subject,
    text: text || "",
    html: html || "",
  };

  try {
    const response = await sgMail.send(msg);
    return {
      success: true,
      messageId: response[0].headers["x-message-id"],
      statusCode: response[0].statusCode,
    };
  } catch (error: unknown) {
    console.error("SendGrid error:", error);
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "body" in error.response
    ) {
      console.error("SendGrid error response:", error.response.body);
    }
    throw error;
  }
}

export async function sendTestEmail(to: string) {
  return sendEmail({
    to,
    subject: "Test Email from Derma Route",
    text: "This is a test email sent via SendGrid API.",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Test Email from Derma Route</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          This is a test email sent via SendGrid API to verify your email integration is working correctly.
        </p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}
          </p>
        </div>
        <p style="font-size: 14px; color: #64748b;">
          If you received this email, your SendGrid integration is working properly!
        </p>
      </div>
    `,
  });
}

/**
 * Send email to multiple recipients using SendGrid's batch sending feature.
 * This is more efficient than sending individual emails and respects rate limits.
 * Recipients won't see each other's email addresses.
 */
export async function sendBatchEmail(
  params: Omit<SendEmailParams, "to"> & { recipients: string[] },
) {
  console.log("📬 [sendBatchEmail] Function called");
  console.log(
    "📬 [sendBatchEmail] Recipients count:",
    params.recipients.length,
  );
  console.log("📬 [sendBatchEmail] Recipients:", params.recipients);
  console.log("📬 [sendBatchEmail] Subject:", params.subject);

  if (isDemoMode()) {
    console.log("[DEMO] Batch email suppressed:", { recipients: params.recipients.length, subject: params.subject });
    return { success: true, sent: 0, messageId: "demo-noop", statusCode: 202 };
  }

  if (!SENDGRID_API_KEY) {
    console.error("❌ [sendBatchEmail] SendGrid API key is not configured");
    throw new Error("SendGrid API key is not configured");
  }

  const { recipients: rawRecipients, subject, text, html, from } = params;

  // Filter out invalid email addresses to prevent SendGrid 400 errors
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipients = rawRecipients.filter((email) => {
    const isValid = emailRegex.test(email);
    if (!isValid) {
      console.warn(`⚠️ [sendBatchEmail] Skipping invalid email address: "${email}"`);
    }
    return isValid;
  });

  if (recipients.length === 0) {
    console.warn("⚠️ [sendBatchEmail] No valid recipients after filtering for batch email");
    return { success: true, sent: 0 };
  }

  if (recipients.length !== rawRecipients.length) {
    console.log(`📬 [sendBatchEmail] Filtered ${rawRecipients.length - recipients.length} invalid email(s), proceeding with ${recipients.length} valid recipient(s)`);
  }

  // SendGrid recommends sending to multiple recipients using the 'to' array
  // Each recipient will receive their own email (they won't see other recipients)
  const msg: MailDataRequired = {
    to: recipients,
    from:
      from || process.env.SENDGRID_FROM_EMAIL || "noreply@integritytissue.com",
    subject,
    text: text || "",
    html: html || "",
  };

  try {
    console.log(`🚀 [SendGrid-Batch] Sending email via SendGrid API...`);
    const response = await sgMail.send(msg);
    console.log(`✅ [SendGrid-Batch] Email sent successfully!`);
    console.log(`✅ [SendGrid-Batch] Status code: ${response[0].statusCode}`);
    console.log(
      `✅ [SendGrid-Batch] Message ID: ${response[0].headers["x-message-id"]}`,
    );
    return {
      success: true,
      sent: recipients.length,
      messageId: response[0].headers["x-message-id"],
      statusCode: response[0].statusCode,
    };
  } catch (error: unknown) {
    console.error("❌ [SendGrid-Batch] SendGrid batch email error:", error);
    if (
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "body" in error.response
    ) {
      console.error("SendGrid error response:", error.response.body);
    }
    throw error;
  }
}

export interface BvNotificationData {
  bvRequestId: string;
  practiceName: string;
  provider: string;
  insurance: string;
  woundType: string;
  woundSize: string;
  woundLocation?: string;
  patientInitials: string;
  applicationDate: string;
  deliveryDate: string;
  createdAt: string;
}

/**
 * Send notification email about a new BV request to clinic staff and admins
 */
export async function sendBvRequestNotification(
  recipients: string[],
  data: BvNotificationData,
) {
  console.log(`📨 [SendGrid] Preparing BV Request notification email...`);
  console.log(`📨 [SendGrid] Recipients: ${recipients.join(", ")}`);
  console.log(`📨 [SendGrid] BV Request ID: ${data.bvRequestId}`);
  console.log(`📨 [SendGrid] Practice: ${data.practiceName}`);

  const subject = `New Benefits Verification Request - ${data.patientInitials}`;
  console.log(`📨 [SendGrid] Subject: ${subject}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: #dbeafe; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1); }
        .alert-box p { margin: 0; color: #1e40af; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { color: #1e40af; font-size: 15px; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4); }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
        .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
        .highlight-box strong { color: #78350f; }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 New Benefits Verification Request</h1>
          <p>Requires Your Review & Approval</p>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <p>🔔 A new <strong>Benefits Verification Request</strong> has been submitted and requires your attention for review and processing.</p>
          </div>

          <div class="section">
            <div class="section-title">Practice Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Practice Name</div>
                <div class="info-value"><strong>${data.practiceName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Ordering Provider</div>
                <div class="info-value">${data.provider}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Patient & Clinical Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Patient Initials</div>
                <div class="info-value"><strong>${data.patientInitials}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Insurance</div>
                <div class="info-value">${data.insurance}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Type</div>
                <div class="info-value">${data.woundType}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Size</div>
                <div class="info-value">${data.woundSize}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Location</div>
                <div class="info-value">${data.woundLocation || "N/A"}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Timeline</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Application Date</div>
                <div class="info-value">${data.applicationDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Delivery Date</div>
                <div class="info-value">${data.deliveryDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Request Submitted</div>
                <div class="info-value">${new Date(data.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              📋 View Dashboard
            </a>
          </div>

          <div class="highlight-box">
            <p>
              <strong>⚠️ Action Required:</strong> Please review and verify this benefits request at your earliest convenience. The provider is awaiting verification to proceed with patient care.
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Request ID: ${data.bvRequestId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Benefits Verification Request

A new Benefits Verification Request has been submitted and requires your attention for review and processing.

Practice Information:
- Practice Name: ${data.practiceName}
- Ordering Provider: ${data.provider}

Patient & Clinical Details:
 - Patient Initials: ${data.patientInitials}
 - Insurance: ${data.insurance}
 - Wound Type: ${data.woundType}
 - Wound Size: ${data.woundSize}
 - Wound Location: ${data.woundLocation || "N/A"}

Timeline:
- Application Date: ${data.applicationDate}
- Delivery Date: ${data.deliveryDate}
- Request Submitted: ${new Date(data.createdAt).toLocaleString()}

ACTION REQUIRED: Please review and verify this benefits request at your earliest convenience. The provider is awaiting verification to proceed with patient care.

Please log in to view this request in your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Request ID: ${data.bvRequestId}

---
Derma Route
This is an automated notification.
  `;

  console.log(
    `📤 [SendGrid] Calling sendBatchEmail with ${recipients.length} recipient(s)...`,
  );
  const result = await sendBatchEmail({
    recipients,
    subject,
    html,
    text,
  });
  console.log(`✅ [SendGrid] BV Request email sent successfully:`, result);
  return result;
}

export interface BvStatusNotificationData {
  bvRequestId: string;
  practiceName: string;
  patientInitials: string;
  insurance: string;
  woundType: string;
  woundSize: string;
  applicationDate: string;
  deliveryDate: string;
  status: "approved" | "rejected";
}

/**
 * Send email notification to the provider when their BV request is approved or rejected.
 */
export async function sendBvStatusNotification(
  recipientEmail: string,
  data: BvStatusNotificationData,
) {
  const isApproved = data.status === "approved";
  const statusLabel = isApproved ? "Approved ✅" : "Denied ❌";
  const subject = `BV Request ${isApproved ? "Approved" : "Denied"} - ${data.patientInitials}`;

  const headerColor = isApproved
    ? "linear-gradient(135deg, #065f46 0%, #10b981 100%)"
    : "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)";

  const alertBg = isApproved
    ? "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)"
    : "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)";

  const alertBorder = isApproved ? "#10b981" : "#ef4444";
  const alertText = isApproved ? "#065f46" : "#7f1d1d";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: ${headerColor}; padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: ${alertBg}; border-left: 4px solid ${alertBorder}; padding: 20px; margin-bottom: 32px; border-radius: 8px; }
        .alert-box p { margin: 0; color: ${alertText}; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid ${alertBorder}; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { font-size: 15px; }
        .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${isApproved ? "#d1fae5" : "#fee2e2"}; color: ${isApproved ? "#065f46" : "#7f1d1d"}; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: ${isApproved ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isApproved ? "✅ BV Request Approved" : "❌ BV Request Denied"}</h1>
          <p>Benefits Verification Status Update</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>
              Your <strong>Benefits Verification Request</strong> for patient <strong>${data.patientInitials}</strong>
              has been <strong>${isApproved ? "approved" : "denied"}</strong> by our team.
            </p>
          </div>

          <div class="section">
            <div class="section-title">Request Status</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="status-badge">${statusLabel}</span></div>
              </div>
              <div class="info-row">
                <div class="info-label">Practice</div>
                <div class="info-value"><strong>${data.practiceName}</strong></div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Request Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Patient Initials</div>
                <div class="info-value"><strong>${data.patientInitials}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Insurance</div>
                <div class="info-value">${data.insurance}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Type</div>
                <div class="info-value">${data.woundType}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Size</div>
                <div class="info-value">${data.woundSize}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Application Date</div>
                <div class="info-value">${data.applicationDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Delivery Date</div>
                <div class="info-value">${data.deliveryDate}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              📋 View My Dashboard
            </a>
          </div>

          ${
            !isApproved
              ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
              <strong>Need assistance?</strong> If you have questions about this decision, please contact our support team for more information.
            </p>
          </div>`
              : ""
          }
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Request ID: ${data.bvRequestId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Benefits Verification Request ${isApproved ? "Approved" : "Denied"}

Your Benefits Verification Request for patient ${data.patientInitials} has been ${data.status} by our team.

Request Details:
- Practice: ${data.practiceName}
- Status: ${statusLabel}
- Patient Initials: ${data.patientInitials}
- Insurance: ${data.insurance}
- Wound Type: ${data.woundType}
- Wound Size: ${data.woundSize}
- Application Date: ${data.applicationDate}
- Delivery Date: ${data.deliveryDate}

View your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Request ID: ${data.bvRequestId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients: [recipientEmail],
    subject,
    html,
    text,
  });
}

export interface BaaNotificationData {
  baaId: string;
  clinicName: string;
  providerEmail: string;
  coveredEntityName: string;
  coveredEntityTitle: string;
  agreementStatus: string;
  submittedDate: string;
  dashboardUrl: string;
}

export interface ProviderAccountCreatedNotificationData {
  providerUserId: string;
  providerAcctId?: string;
  clinicName: string;
  providerEmail: string;
  accountPhone: string;
  npiNumber: string;
  clinicAddress?: string;
  clinicPhone?: string;
  providerSpecialty?: string;
  createdAt: string;
}

/**
 * Send notification email about a newly created Provider account to clinic staff and admins.
 * Pass a role-specific dashboardUrl (e.g. "/admin" or "/clinic-staff").
 */
export async function sendProviderAccountCreatedNotification(
  recipients: string[],
  data: ProviderAccountCreatedNotificationData & { dashboardUrl: string },
) {
  const subject = `New Provider Account Created - ${data.clinicName}`;

  const createdAtFormatted = new Date(data.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const dashboardLink = `${process.env.APP_URL || "http://localhost:3000"}${data.dashboardUrl}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: #dbeafe; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1); }
        .alert-box p { margin: 0; color: #1e40af; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 160px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { color: #1e40af; font-size: 15px; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4); }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
        .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
        .highlight-box strong { color: #78350f; }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👤 New Provider Account Created</h1>
          <p>Notification for Review & Onboarding</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>🔔 A new <strong>Provider account</strong> has been created. Please review the details and proceed with any required onboarding steps.</p>
          </div>

          <div class="section">
            <div class="section-title">Provider Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Clinic/Practice Name</div>
                <div class="info-value"><strong>${data.clinicName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Provider Email</div>
                <div class="info-value">${data.providerEmail}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Account Phone</div>
                <div class="info-value">${data.accountPhone}</div>
              </div>
              <div class="info-row">
                <div class="info-label">NPI Number</div>
                <div class="info-value">${data.npiNumber}</div>
              </div>
              ${
                data.providerSpecialty
                  ? `
              <div class="info-row">
                <div class="info-label">Specialty</div>
                <div class="info-value">${data.providerSpecialty}</div>
              </div>
              `
                  : ""
              }
              ${
                data.clinicPhone
                  ? `
              <div class="info-row">
                <div class="info-label">Clinic Phone</div>
                <div class="info-value">${data.clinicPhone}</div>
              </div>
              `
                  : ""
              }
              ${
                data.clinicAddress
                  ? `
              <div class="info-row">
                <div class="info-label">Clinic Address</div>
                <div class="info-value">${data.clinicAddress}</div>
              </div>
              `
                  : ""
              }
              <div class="info-row">
                <div class="info-label">Created</div>
                <div class="info-value">${createdAtFormatted}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${dashboardLink}" class="button" style="color: #ffffff !important; text-decoration: none;">
              📋 View Dashboard
            </a>
          </div>

          <div class="highlight-box">
            <p>
              <strong>⚠️ Action Required:</strong> Review the provider account details and verify any required documentation or agreements.
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          ${data.providerAcctId ? `<p>Provider Account ID: ${data.providerAcctId}</p>` : ""}
          <p>User ID: ${data.providerUserId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Provider Account Created

A new Provider account has been created.

Provider Details:
- Clinic/Practice Name: ${data.clinicName}
- Provider Email: ${data.providerEmail}
- Account Phone: ${data.accountPhone}
- NPI Number: ${data.npiNumber}
${data.providerSpecialty ? `- Specialty: ${data.providerSpecialty}\n` : ""}${data.clinicPhone ? `- Clinic Phone: ${data.clinicPhone}\n` : ""}${data.clinicAddress ? `- Clinic Address: ${data.clinicAddress}\n` : ""}- Created: ${new Date(data.createdAt).toLocaleString()}

Please log in to view the dashboard:
${dashboardLink}

${data.providerAcctId ? `Provider Account ID: ${data.providerAcctId}\n` : ""}User ID: ${data.providerUserId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients,
    subject,
    html,
    text,
  });
}

export interface BaaStatusNotificationToProviderData {
  baaId: string;
  clinicName: string;
  coveredEntityName: string;
  coveredEntityTitle: string;
  status: "approved" | "cancelled";
  updatedAt: string;
}

/**
 * Send email notification to the provider when their BAA is approved or cancelled by admin/clinic staff.
 */
export async function sendBaaStatusNotificationToProvider(
  recipientEmail: string,
  data: BaaStatusNotificationToProviderData,
) {
  const isApproved = data.status === "approved";
  const statusLabel = isApproved ? "Approved ✅" : "Cancelled ❌";
  const subject = `Your Business Associate Agreement has been ${isApproved ? "Approved" : "Cancelled"} - ${data.clinicName}`;

  const headerColor = isApproved
    ? "linear-gradient(135deg, #065f46 0%, #10b981 100%)"
    : "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)";

  const alertBg = isApproved
    ? "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)"
    : "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)";

  const alertBorder = isApproved ? "#10b981" : "#ef4444";
  const alertText = isApproved ? "#065f46" : "#7f1d1d";
  const badgeBg = isApproved ? "#d1fae5" : "#fee2e2";
  const badgeColor = isApproved ? "#065f46" : "#7f1d1d";

  const updatedAtFormatted = new Date(data.updatedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: ${headerColor}; padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: ${alertBg}; border-left: 4px solid ${alertBorder}; padding: 20px; margin-bottom: 32px; border-radius: 8px; }
        .alert-box p { margin: 0; color: ${alertText}; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid ${alertBorder}; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { font-size: 15px; }
        .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${badgeBg}; color: ${badgeColor}; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: ${isApproved ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isApproved ? "✅ BAA Approved" : "❌ BAA Cancelled"}</h1>
          <p>Business Associate Agreement Status Update</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>
              Your <strong>Business Associate Agreement (BAA)</strong> for <strong>${data.clinicName}</strong>
              has been <strong>${isApproved ? "approved" : "cancelled"}</strong> by our team.
            </p>
          </div>

          <div class="section">
            <div class="section-title">Agreement Status</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="status-badge">${statusLabel}</span></div>
              </div>
              <div class="info-row">
                <div class="info-label">Clinic/Practice</div>
                <div class="info-value"><strong>${data.clinicName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Updated</div>
                <div class="info-value">${updatedAtFormatted}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Covered Entity Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Name</div>
                <div class="info-value">${data.coveredEntityName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Title</div>
                <div class="info-value">${data.coveredEntityTitle}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              📋 View My Dashboard
            </a>
          </div>

          ${
            !isApproved
              ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 16px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
              <strong>Need assistance?</strong> If you have questions about this decision, please contact our support team for more information.
            </p>
          </div>`
              : ""
          }
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Agreement ID: ${data.baaId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Business Associate Agreement ${isApproved ? "Approved" : "Cancelled"}

Your Business Associate Agreement for ${data.clinicName} has been ${data.status} by our team.

Agreement Details:
- Clinic/Practice: ${data.clinicName}
- Status: ${statusLabel}
- Covered Entity Name: ${data.coveredEntityName}
- Covered Entity Title: ${data.coveredEntityTitle}
- Updated: ${updatedAtFormatted}

View your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Agreement ID: ${data.baaId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients: [recipientEmail],
    subject,
    html,
    text,
  });
}

/**
 * Send notification email about a new BAA Provider Agreement to clinic staff and admins
 */
export async function sendBaaAgreementNotification(
  recipients: string[],
  data: BaaNotificationData,
) {
  console.log(`📨 [SendGrid] Preparing BAA notification email...`);
  console.log(`📨 [SendGrid] Recipients: ${recipients.join(", ")}`);
  console.log(`📨 [SendGrid] BAA ID: ${data.baaId}`);
  console.log(`📨 [SendGrid] Clinic: ${data.clinicName}`);

  const subject = `New Business Associate Agreement - ${data.clinicName}`;
  console.log(`📨 [SendGrid] Subject: ${subject}`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: #dbeafe; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1); }
        .alert-box p { margin: 0; color: #1e40af; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid #3b82f6; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-signed { background-color: #d1fae5; color: #065f46; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4); }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
        .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
        .highlight-box strong { color: #78350f; }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Business Associate Agreement</h1>
          <p>Requires Your Review & Approval</p>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <p>🔔 A new <strong>Business Associate Agreement (BAA)</strong> has been submitted and requires your attention for review and approval.</p>
          </div>

          <div class="section">
            <div class="section-title">Agreement Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge status-${data.agreementStatus.toLowerCase()}">
                    ${data.agreementStatus}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">Submitted Date</div>
                <div class="info-value">${new Date(data.submittedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Provider Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Clinic Name</div>
                <div class="info-value"><strong>${data.clinicName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Provider Email</div>
                <div class="info-value">${data.providerEmail}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Covered Entity Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Name</div>
                <div class="info-value">${data.coveredEntityName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Title</div>
                <div class="info-value">${data.coveredEntityTitle}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}${data.dashboardUrl}" class="button" style="color: #ffffff !important; text-decoration: none;">
              📄 View Dashboard
            </a>
          </div>

          <div class="highlight-box">
            <p>
              <strong>⚠️ Action Required:</strong> Please review this Business Associate Agreement at your earliest convenience. The provider is waiting for approval to proceed with services.
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Agreement ID: ${data.baaId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Business Associate Agreement (BAA)

A new Business Associate Agreement has been submitted and requires your review and approval.

Agreement Information:
- Status: ${data.agreementStatus}
- Submitted: ${new Date(data.submittedDate).toLocaleString()}

Provider Details:
- Clinic Name: ${data.clinicName}
- Provider Email: ${data.providerEmail}

Covered Entity:
- Name: ${data.coveredEntityName}
- Title: ${data.coveredEntityTitle}

Please log in to view this agreement in your dashboard:
${process.env.APP_URL || "http://localhost:3000"}${data.dashboardUrl}

Agreement ID: ${data.baaId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients,
    subject,
    html,
    text,
  });
}

// ─── Order Submission Notification ──────────────────────────────────────────

export interface OrderSubmissionNotificationData {
  orderId: string;
  practiceName: string;
  provider: string;
  productName: string;
  productCode: string;
  manufacturer: string;
  patientInitials: string;
  insurance: string;
  woundType: string;
  woundSize: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  deliveryDate?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Send notification email to admins and clinic staff when a new product order is placed.
 */
export async function sendOrderSubmissionNotification(
  recipients: string[],
  data: OrderSubmissionNotificationData,
) {
  console.log(`📨 [SendGrid] Preparing Order Submission notification email...`);
  console.log(`📨 [SendGrid] Recipients: ${recipients.join(", ")}`);
  console.log(`📨 [SendGrid] Order ID: ${data.orderId}`);
  console.log(`📨 [SendGrid] Practice: ${data.practiceName}`);

  const subject = `New Product Order - ${data.patientInitials} | ${data.productName}`;

  const deliveryAddressFull = [
    data.deliveryAddress,
    data.deliveryCity,
    data.deliveryState ? `${data.deliveryState} ${data.deliveryZip || ""}`.trim() : data.deliveryZip,
  ]
    .filter(Boolean)
    .join(", ") || "Not provided";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: #d1fae5; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%); border-left: 4px solid #10b981; padding: 20px; margin-bottom: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1); }
        .alert-box p { margin: 0; color: #065f46; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid #10b981; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { color: #065f46; font-size: 15px; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4); }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
        .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
        .highlight-box strong { color: #78350f; }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Product Order Submitted</h1>
          <p>Requires Your Review & Fulfillment</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>A new <strong>Product Order</strong> has been placed and is awaiting review and fulfillment processing.</p>
          </div>

          <div class="section">
            <div class="section-title">Practice Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Practice Name</div>
                <div class="info-value"><strong>${data.practiceName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Ordering Provider</div>
                <div class="info-value">${data.provider}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Order Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Patient Initials</div>
                <div class="info-value"><strong>${data.patientInitials}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Product</div>
                <div class="info-value">${data.productName}${data.productCode ? ` (${data.productCode})` : ""}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Manufacturer</div>
                <div class="info-value">${data.manufacturer}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Insurance</div>
                <div class="info-value">${data.insurance}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Type</div>
                <div class="info-value">${data.woundType}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Size</div>
                <div class="info-value">${data.woundSize}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Delivery Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Delivery Address</div>
                <div class="info-value">${deliveryAddressFull}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Delivery Date</div>
                <div class="info-value">${data.deliveryDate || "Not specified"}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Contact Phone</div>
                <div class="info-value">${data.contactPhone || "Not provided"}</div>
              </div>
              ${data.notes ? `
              <div class="info-row">
                <div class="info-label">Notes</div>
                <div class="info-value">${data.notes}</div>
              </div>
              ` : ""}
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              View Dashboard
            </a>
          </div>

          <div class="highlight-box">
            <p>
              <strong>Action Required:</strong> Please review this order and begin fulfillment processing. The provider is awaiting confirmation and shipment details.
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Order ID: ${data.orderId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Product Order Submitted

A new Product Order has been placed and is awaiting review and fulfillment processing.

Practice Information:
- Practice Name: ${data.practiceName}
- Ordering Provider: ${data.provider}

Order Details:
- Patient Initials: ${data.patientInitials}
- Product: ${data.productName}${data.productCode ? ` (${data.productCode})` : ""}
- Manufacturer: ${data.manufacturer}
- Insurance: ${data.insurance}
- Wound Type: ${data.woundType}
- Wound Size: ${data.woundSize}

Delivery Information:
- Address: ${deliveryAddressFull}
- Delivery Date: ${data.deliveryDate || "Not specified"}
- Contact Phone: ${data.contactPhone || "Not provided"}${data.notes ? `\n- Notes: ${data.notes}` : ""}

ACTION REQUIRED: Please review this order and begin fulfillment processing. The provider is awaiting confirmation and shipment details.

Please log in to view this order in your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Order ID: ${data.orderId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients,
    subject,
    html,
    text,
  });
}

/**
 * Send order submission confirmation email to the provider when their order is placed.
 */
export async function sendOrderSubmissionConfirmationToProvider(
  recipientEmail: string,
  data: OrderSubmissionNotificationData,
) {
  const subject = `Order Received - Patient ${data.patientInitials} | ${data.productName}`;

  const deliveryAddressFull = [
    data.deliveryAddress,
    data.deliveryCity,
    data.deliveryState ? `${data.deliveryState} ${data.deliveryZip || ""}`.trim() : data.deliveryZip,
  ]
    .filter(Boolean)
    .join(", ") || "Not provided";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #3B82F6 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1); }
        .alert-box p { margin: 0; color: #1e3a5f; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid #3B82F6; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { color: #1e3a5f; font-size: 15px; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3); }
        .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 32px; }
        .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
        .highlight-box strong { color: #78350f; }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 32px 20px; }
          .info-row { flex-direction: column; }
          .info-label { margin-bottom: 4px; }
          .button { padding: 14px 32px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Received ✅</h1>
          <p>Your product order has been submitted successfully</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>Your <strong>Product Order</strong> has been received and is currently being reviewed by our team. You will receive another notification once the status changes.</p>
          </div>

          <div class="section">
            <div class="section-title">Order Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Patient Initials</div>
                <div class="info-value"><strong>${data.patientInitials}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Product</div>
                <div class="info-value">${data.productName}${data.productCode ? ` (${data.productCode})` : ""}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Manufacturer</div>
                <div class="info-value">${data.manufacturer}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Insurance</div>
                <div class="info-value">${data.insurance}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Type</div>
                <div class="info-value">${data.woundType}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Wound Size</div>
                <div class="info-value">${data.woundSize}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Delivery Information</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Delivery Address</div>
                <div class="info-value">${deliveryAddressFull}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Delivery Date</div>
                <div class="info-value">${data.deliveryDate || "Not specified"}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Contact Phone</div>
                <div class="info-value">${data.contactPhone || "Not provided"}</div>
              </div>
              ${data.notes ? `
              <div class="info-row">
                <div class="info-label">Notes</div>
                <div class="info-value">${data.notes}</div>
              </div>
              ` : ""}
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              View My Dashboard
            </a>
          </div>

          <div class="highlight-box">
            <p>
              <strong>What's next?</strong> Our team will review your order and update the status. You will receive an email notification for each status update (approved, shipped, completed, etc.).
            </p>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Order ID: ${data.orderId}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Confidential & HIPAA Compliant Communication</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Order Received

Your Product Order has been received and is currently being reviewed by our team.

Order Details:
- Patient Initials: ${data.patientInitials}
- Product: ${data.productName}${data.productCode ? ` (${data.productCode})` : ""}
- Manufacturer: ${data.manufacturer}
- Insurance: ${data.insurance}
- Wound Type: ${data.woundType}
- Wound Size: ${data.woundSize}

Delivery Information:
- Address: ${deliveryAddressFull}
- Delivery Date: ${data.deliveryDate || "Not specified"}
- Contact Phone: ${data.contactPhone || "Not provided"}${data.notes ? `\n- Notes: ${data.notes}` : ""}

You will receive another email notification once the order status is updated.

View your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Order ID: ${data.orderId}

---
Derma Route
This is an automated notification.
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });
}

export type OrderStatusType = "approved" | "shipped" | "completed" | "denied" | "cancelled";

export interface OrderStatusNotificationData {
  orderId: string;
  patientInitials: string;
  productName: string;
  status: OrderStatusType;
}

const ORDER_STATUS_CONFIG: Record<OrderStatusType, {
  label: string;
  emoji: string;
  headerGradient: string;
  alertBg: string;
  alertBorder: string;
  alertText: string;
  badgeBg: string;
  badgeColor: string;
  buttonGradient: string;
  verb: string;
}> = {
  approved: {
    label: "Approved ✅",
    emoji: "✅",
    headerGradient: "linear-gradient(135deg, #065f46 0%, #22C55E 100%)",
    alertBg: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)",
    alertBorder: "#22C55E",
    alertText: "#065f46",
    badgeBg: "#d1fae5",
    badgeColor: "#065f46",
    buttonGradient: "linear-gradient(135deg, #22C55E 0%, #16a34a 100%)",
    verb: "approved",
  },
  shipped: {
    label: "Shipped 📦",
    emoji: "📦",
    headerGradient: "linear-gradient(135deg, #1e3a5f 0%, #3B82F6 100%)",
    alertBg: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
    alertBorder: "#3B82F6",
    alertText: "#1e3a5f",
    badgeBg: "#dbeafe",
    badgeColor: "#1e3a5f",
    buttonGradient: "linear-gradient(135deg, #3B82F6 0%, #2563eb 100%)",
    verb: "shipped",
  },
  completed: {
    label: "Completed ✔️",
    emoji: "✔️",
    headerGradient: "linear-gradient(135deg, #064e3b 0%, #16A34A 100%)",
    alertBg: "linear-gradient(135deg, #bbf7d0 0%, #dcfce7 100%)",
    alertBorder: "#16A34A",
    alertText: "#064e3b",
    badgeBg: "#bbf7d0",
    badgeColor: "#064e3b",
    buttonGradient: "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
    verb: "completed",
  },
  denied: {
    label: "Denied ❌",
    emoji: "❌",
    headerGradient: "linear-gradient(135deg, #7f1d1d 0%, #EF4444 100%)",
    alertBg: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)",
    alertBorder: "#EF4444",
    alertText: "#7f1d1d",
    badgeBg: "#fee2e2",
    badgeColor: "#7f1d1d",
    buttonGradient: "linear-gradient(135deg, #EF4444 0%, #dc2626 100%)",
    verb: "denied",
  },
  cancelled: {
    label: "Cancelled 🚫",
    emoji: "🚫",
    headerGradient: "linear-gradient(135deg, #374151 0%, #6B7280 100%)",
    alertBg: "linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)",
    alertBorder: "#6B7280",
    alertText: "#374151",
    badgeBg: "#e5e7eb",
    badgeColor: "#374151",
    buttonGradient: "linear-gradient(135deg, #6B7280 0%, #4b5563 100%)",
    verb: "cancelled",
  },
};

/**
 * Send email notification to the provider when their Product Order status changes.
 * Supports: approved, shipped, completed, denied, cancelled.
 */
export async function sendOrderStatusNotificationToProvider(
  recipientEmail: string,
  data: OrderStatusNotificationData,
) {
  const cfg = ORDER_STATUS_CONFIG[data.status];
  const statusCapitalized = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const subject = `Product Order ${statusCapitalized} - Patient ${data.patientInitials}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: ${cfg.headerGradient}; padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: ${cfg.alertBg}; border-left: 4px solid ${cfg.alertBorder}; padding: 20px; margin-bottom: 32px; border-radius: 8px; }
        .alert-box p { margin: 0; color: ${cfg.alertText}; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 3px solid ${cfg.alertBorder}; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .info-value strong { font-size: 15px; }
        .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${cfg.badgeBg}; color: ${cfg.badgeColor}; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: ${cfg.buttonGradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 32px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${cfg.emoji} Product Order ${statusCapitalized}</h1>
          <p>Product Order Status Update</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>
              Your <strong>Product Order</strong> for patient <strong>${data.patientInitials}</strong>
              has been <strong>${cfg.verb}</strong> by our team.
            </p>
          </div>

          <div class="section">
            <div class="section-title">Order Details</div>
            <div class="info-card">
              <div class="info-row">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="status-badge">${cfg.label}</span></div>
              </div>
              <div class="info-row">
                <div class="info-label">Patient Initials</div>
                <div class="info-value"><strong>${data.patientInitials}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Product</div>
                <div class="info-value">${data.productName}</div>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/dashboard" class="button" style="color: #ffffff !important; text-decoration: none;">
              📋 View Dashboard
            </a>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Order ID: ${data.orderId}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Product Order ${statusCapitalized}

Your Product Order for patient ${data.patientInitials} has been ${cfg.verb} by our team.

Order Details:
- Status: ${cfg.label}
- Patient Initials: ${data.patientInitials}
- Product: ${data.productName}

View your dashboard:
${process.env.APP_URL || "http://localhost:3000"}/dashboard

Order ID: ${data.orderId}

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients: [recipientEmail],
    subject,
    html,
    text,
  });
}

/**
 * Send email notification to admins when a new ITS Representative registers and needs approval.
 */
export async function sendPendingItsRepNotification(
  adminEmails: string[],
  data: { name: string; email: string; phone: string },
) {
  if (adminEmails.length === 0) return;

  const subject = `New ITS Representative Pending Approval - ${data.name}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #92400e 0%, #f59e0b 100%); padding: 40px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 32px; }
        .alert-box { background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 32px; border-radius: 8px; }
        .alert-box p { margin: 0; color: #92400e; font-weight: 500; font-size: 15px; line-height: 1.6; }
        .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; min-width: 140px; }
        .info-value { color: #1f2937; font-size: 14px; flex: 1; }
        .button-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
        .footer { background-color: #fafafa; padding: 32px 24px; text-align: center; border-top: 2px solid #e5e7eb; }
        .footer p { margin: 6px 0; color: #6b7280; font-size: 13px; }
        .footer strong { color: #1f2937; font-size: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏳ New ITS Representative Pending Approval</h1>
          <p>Action Required</p>
        </div>

        <div class="content">
          <div class="alert-box">
            <p>
              A new <strong>ITS Representative</strong> has registered and is <strong>awaiting your approval</strong> before they can sign in.
            </p>
          </div>

          <div class="info-card">
            <div class="info-row">
              <div class="info-label">Name</div>
              <div class="info-value"><strong>${data.name}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">Email</div>
              <div class="info-value">${data.email}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Phone</div>
              <div class="info-value">${data.phone}</div>
            </div>
          </div>

          <div class="button-container">
            <a href="${process.env.APP_URL || "http://localhost:3000"}/admin?tab=its_representatives" class="button" style="color: #ffffff !important; text-decoration: none;">
              👤 Review & Approve
            </a>
          </div>
        </div>

        <div class="footer">
          <p><strong>Derma Route</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New ITS Representative Pending Approval

A new ITS Representative has registered and needs your approval.

Details:
- Name: ${data.name}
- Email: ${data.email}
- Phone: ${data.phone}

Please log in to review and approve:
${process.env.APP_URL || "http://localhost:3000"}/admin?tab=its_representatives

---
Derma Route
This is an automated notification.
  `;

  return sendBatchEmail({
    recipients: adminEmails,
    subject,
    html,
    text,
  });
}
