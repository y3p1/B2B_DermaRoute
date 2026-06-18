export const PUBLIC_ROUTE_PREFIXES = ["/auth", "/signup", "/legal"] as const;
export const PUBLIC_ROUTES = [
  "/",
  "/no-tracks",
  "/admin/signin",
  "/admin/signup",
  "/api-documentation",
  "/demo",
] as const;
export const DEFAULT_UNAUTHENTICATED_REDIRECT = "/auth";

// These public routes should NOT redirect authenticated users away — they are
// accessible to everyone (landing page, no-tracks info page).
const OPEN_ROUTES = ["/", "/no-tracks"] as const;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isOpenPath(pathname: string): boolean {
  return (OPEN_ROUTES as readonly string[]).includes(pathname);
}

export function getAuthenticatedRedirect(
  enabledTracks: string[],
  accountType: string,
  role: string,
): string {
  if (accountType === "admin") return "/admin";
  if (role === "clinic_staff") return "/clinic-staff";
  if (enabledTracks.length === 0) return "/no-tracks";
  if (enabledTracks.includes("wound_care") || enabledTracks.includes("lymphedema"))
    return "/dashboard";
  if (enabledTracks.includes("ocular"))
    return "/ocular/dashboard";
  return "/";
}
