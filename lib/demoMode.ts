export const DEMO_ROLE_COOKIE = "demo_role";
export type DemoRole = "provider" | "provider_ocular" | "provider_wound2" | "clinic_staff" | "admin";

const VALID_ROLES: DemoRole[] = ["provider", "provider_ocular", "provider_wound2", "clinic_staff", "admin"];

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function isClientDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function setDemoRoleCookie(role: DemoRole): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_ROLE_COOKIE}=${role}; path=/; max-age=86400; samesite=lax`;
}

function parseCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(eqIdx + 1).trim());
    }
  }
  return undefined;
}

export function getDemoRoleFromRequest(req: {
  headers: Record<string, string | undefined>;
  url: string;
}): DemoRole {
  // 1. Cookie
  const fromCookie = parseCookieValue(req.headers["cookie"], DEMO_ROLE_COOKIE);
  if (fromCookie && VALID_ROLES.includes(fromCookie as DemoRole)) {
    return fromCookie as DemoRole;
  }

  // 2. ?role= query param
  try {
    const url = new URL(req.url, "http://localhost");
    const fromQuery = url.searchParams.get("role");
    if (fromQuery && VALID_ROLES.includes(fromQuery as DemoRole)) {
      return fromQuery as DemoRole;
    }
  } catch {
    // ignore malformed URLs
  }

  // 3. X-Demo-Role header
  const fromHeader = req.headers["x-demo-role"];
  if (fromHeader && VALID_ROLES.includes(fromHeader as DemoRole)) {
    return fromHeader as DemoRole;
  }

  return "provider";
}

const ROLE_EMAIL: Record<DemoRole, string> = {
  provider: "demo-provider@dermaroute-demo.example.com",
  provider_ocular: "demo-ocular@dermaroute-demo.example.com",
  provider_wound2: "demo-wound2@dermaroute-demo.example.com",
  admin: "demo-admin@dermaroute-demo.example.com",
  clinic_staff: "demo-clinicstaff@dermaroute-demo.example.com",
};

// Deterministic per-role user IDs. Demo mode does not authenticate against
// real Supabase users, so these fixed UUIDs are the single source of truth
// for demo identity — used both here (request → userId) and by the demo
// seed scripts (userId → providerAcct). Keeping them env-independent means
// local and Vercel resolve to the same provider without env var syncing.
export const DEMO_USER_IDS: Record<DemoRole, string> = {
  provider:        "00000000-0000-4000-8000-000000000001",
  provider_wound2: "00000000-0000-4000-8000-000000000002",
  provider_ocular: "00000000-0000-4000-8000-000000000003",
  admin:           "00000000-0000-4000-8000-000000000004",
  clinic_staff:    "00000000-0000-4000-8000-000000000005",
};

export const DEMO_TRACK_LABELS: Record<string, string> = {
  wound_care: "Wound Care",
  lymphedema: "Medical Devices",
  ocular: "Ocular",
};

export const DEMO_ROLE_TRACKS: Record<DemoRole, string[]> = {
  provider:        ["wound_care", "lymphedema"],
  provider_wound2: ["wound_care"],
  provider_ocular: ["ocular"],
  clinic_staff:    [],
  admin:           [],
};

export function getDemoUser(role: DemoRole): { userId: string; user: object } {
  const userId = DEMO_USER_IDS[role];
  return {
    userId,
    user: {
      id: userId,
      email: ROLE_EMAIL[role],
      phone: null,
      user_metadata: { role },
      aud: "authenticated",
      created_at: "2024-01-01T00:00:00.000Z",
    },
  };
}
