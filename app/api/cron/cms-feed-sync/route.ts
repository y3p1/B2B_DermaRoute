import { NextResponse } from "next/server";
import { syncRssFeeds } from "@/backend/services/cmsPolicyUpdates.service";

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
