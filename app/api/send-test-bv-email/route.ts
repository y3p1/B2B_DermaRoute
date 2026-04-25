import { NextRequest, NextResponse } from "next/server";
import { sendBvRequestNotification } from "@/backend/services/sendgrid.service";

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

    // Send a test BV notification with sample data
    const result = await sendBvRequestNotification([to], {
      bvRequestId:
        "TEST-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      practiceName: "Sample Medical Clinic",
      provider: "Dr. John Smith, MD",
      insurance: "Blue Cross Blue Shield",
      woundType: "Diabetic Foot Ulcer",
      woundSize: "3.5 x 2.0 cm",
      patientInitials: "J.D.",
      applicationDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      deliveryDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Test BV Request notification email sent successfully",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Send test BV email error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to send test BV email",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
