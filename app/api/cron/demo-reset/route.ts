import { NextResponse } from "next/server";
import { isDemoMode } from "../../../../lib/demoMode";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDemoMode()) {
    return new NextResponse("Not available outside demo mode", { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    queryKey !== process.env.CRON_SECRET
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const start = Date.now();
    const { runDemoReset } = await import("../../../../scripts/demo/resetDemo");
    const result = await runDemoReset();
    return NextResponse.json({
      success: true,
      secondsElapsed: Math.round((Date.now() - start) / 1000),
      ...result,
    });
  } catch (err) {
    console.error("Demo reset failed", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
