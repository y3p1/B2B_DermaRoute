import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const docPath = path.join(process.cwd(), "API_DOCUMENTATION.md");
  try {
    const doc = await fs.readFile(docPath, "utf-8");
    return new NextResponse(doc, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    return new NextResponse("API documentation not found.", { status: 404 });
  }
}
