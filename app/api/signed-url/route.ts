import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.warn(
    "Signed-url route running without Supabase config. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).",
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bucket, path, expiresIn } = body ?? {};

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing bucket or path" },
        { status: 400 },
      );
    }

    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { error: "Server not configured with SUPABASE keys" },
        { status: 500 },
      );
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceRole);

    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .createSignedUrl(
        path,
        typeof expiresIn === "number" ? expiresIn : 60 * 60 * 24 * 7,
      );

    if (error) {
      return NextResponse.json(
        { error: error.message ?? error },
        { status: 500 },
      );
    }

    return NextResponse.json({ signedUrl: data?.signedUrl ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
