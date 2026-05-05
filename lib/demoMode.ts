export const DEMO_ROLE_COOKIE = "demo_role";
export type DemoRole = "provider" | "clinic_staff" | "admin";

const VALID_ROLES: DemoRole[] = ["provider", "clinic_staff", "admin"];

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

const ROLE_USER_ENV: Record<DemoRole, string> = {
  provider: "DEMO_PROVIDER_USER_ID",
  admin: "DEMO_ADMIN_USER_ID",
  clinic_staff: "DEMO_CLINIC_STAFF_USER_ID",
};

const ROLE_EMAIL: Record<DemoRole, string> = {
  provider: "demo-provider@dermaroute-demo.example.com",
  admin: "demo-admin@dermaroute-demo.example.com",
  clinic_staff: "demo-clinicstaff@dermaroute-demo.example.com",
};

export function getDemoUser(role: DemoRole): { userId: string; user: object } {
  const userId =
    process.env[ROLE_USER_ENV[role]] ||
    `00000000-0000-4000-a000-${role.replace("_", "").padStart(12, "0").slice(0, 12)}`;
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
