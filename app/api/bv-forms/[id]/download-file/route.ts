import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/backend/services/supabaseAdmin";
import { getBvFormById } from "@/backend/services/bvForms.service";

/**
 * GET /api/bv-forms/:id/download-file?token=<jwt>
 *
 * Server-side file proxy — fetches the PDF from Supabase Storage on the server
 * and returns it with `Content-Disposition: attachment` so the browser always
 * saves it to the Downloads folder instead of opening a new tab.
 *
 * The JWT is accepted as a query parameter (`token=`) because this endpoint is
 * hit via a plain `<a href>` navigation that cannot send Authorization headers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing form ID" }, { status: 400 });
    }

    // ── Auth: accept token from Authorization header OR ?token= query param ──
    const authHeader = request.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    const queryToken = request.nextUrl.searchParams.get("token");
    const token = headerToken ?? queryToken;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 },
      );
    }

    // Validate the JWT
    const supabase = getSupabaseAdminClient();
    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    // ── Fetch the form record ─────────────────────────────────────────────────
    const form = await getBvFormById(id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // ── Generate a short-lived signed URL (60 seconds is enough) ─────────────
    const { data: signData, error: signError } = await supabase.storage
      .from("bv-forms")
      .createSignedUrl(form.filePath, 60);

    if (signError || !signData?.signedUrl) {
      return NextResponse.json(
        {
          error:
            "Could not generate download URL. The file may not be uploaded yet.",
        },
        { status: 404 },
      );
    }

    // ── Fetch the file server-side and stream it back ─────────────────────────
    const fileResponse = await fetch(signData.signedUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "File not found in storage." },
        { status: 404 },
      );
    }

    const blob = await fileResponse.blob();
    const buffer = await blob.arrayBuffer();

    const safeFileName = encodeURIComponent(form.fileName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${form.fileName}"; filename*=UTF-8''${safeFileName}`,
        "Content-Length": String(buffer.byteLength),
        // Prevent caching of signed / sensitive file data
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[download-file] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
