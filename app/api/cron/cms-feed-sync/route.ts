import { NextResponse } from "next/server";
import { isDemoMode } from "../../../../lib/demoMode";
import { syncRssFeeds } from "@/backend/services/cmsPolicyUpdates.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (isDemoMode()) {
      return NextResponse.json({
        success: true,
        sourcesChecked: 0,
        newItems: 0,
        message: "Demo mode — CMS feed sync skipped.",
      });
    }

    const result = await syncRssFeeds();

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.sourcesChecked} feeds. ${result.newItems} new wound-care items found.`,
    });
  } catch (err) {
    console.error("Failed to run CMS feed sync cron", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
