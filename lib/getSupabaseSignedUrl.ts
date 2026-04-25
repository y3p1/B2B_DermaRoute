/**
 * Request a signed URL from the server API.
 * This avoids using the public anon key in the browser to generate signed URLs.
 */
export async function getSupabaseSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 60 * 24 * 7, // 1 week
): Promise<string | null> {
  try {
    const res = await fetch("/api/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path, expiresIn }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Signed URL API error:", data);
      return null;
    }
    if (!data?.signedUrl) {
      console.warn("Signed URL API returned no signedUrl", data);
      return null;
    }
    return data.signedUrl as string;
  } catch (err) {
    console.error("Failed to request signed URL:", err);
    return null;
  }
}
