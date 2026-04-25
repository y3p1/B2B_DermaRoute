import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail } from "@/backend/services/sendgrid.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 },
      );
    }

    const result = await sendTestEmail(to);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Send test email error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
