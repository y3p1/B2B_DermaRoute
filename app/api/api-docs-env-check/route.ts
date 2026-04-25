import { NextResponse } from "next/server";

export async function GET() {
  const valid =
    !!process.env.JWT_SECRET_KEY &&
    process.env.JWT_SECRET_KEY.trim().length > 0;
  return NextResponse.json({ valid });
}
