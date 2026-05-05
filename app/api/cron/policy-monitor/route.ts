import { NextResponse } from "next/server";
import { isDemoMode } from "../../../../lib/demoMode";
import { checkAllPolicyMonitors } from "@/backend/services/coveragePlans.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
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

    if (isDemoMode()) {
      return NextResponse.json({
        success: true,
        checked: 0,
        changed: 0,
        errors: 0,
        message: "Demo mode — policy monitor skipped.",
      });
    }

    const result = await checkAllPolicyMonitors();

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.checked} monitors. ${result.changed} changes detected. ${result.errors} errors.`,
    });
  } catch (err) {
    console.error("Failed to run policy monitor cron", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
