export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

export function getSupabaseUrl(): string {
  // URL is not sensitive; allow fallback to NEXT_PUBLIC to ease local setup.
  return process.env.NEXT_PUBLIC_SUPABASE_URL || getRequiredEnv("SUPABASE_URL");
}

export function getSupabaseServiceRoleKey(): string {
  // Service role key must NEVER be exposed as NEXT_PUBLIC.
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getAllowedOrigins(): string[] {
  const appUrl = getAppUrl();

  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://integrity-tissue-staging.vercel.app",
    "https://ntegrity-tissue-staging.vercel.app",
    // If you ever have a different staging slug, you can override via FRONTEND_ORIGINS
    "https://www.integritytissue.com",
    "https://integritytissue.com",
  ];

  const fromEnv = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Include APP_URL too (useful if it differs per environment)
  return Array.from(new Set([appUrl, ...defaults, ...fromEnv]));
}

export function getPort(): number {
  return parseInt(process.env.PORT || "3000", 10);
}

export function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}
