export const PUBLIC_ROUTE_PREFIXES = ["/auth", "/signup", "/legal"] as const;
export const PUBLIC_ROUTES = [
  "/admin/signin",
  "/admin/signup",
  "/api-documentation",
  "/demo",
] as const;
export const DEFAULT_AUTHENTICATED_REDIRECT = "/";
export const DEFAULT_UNAUTHENTICATED_REDIRECT = "/auth";
export const LEGACY_AUTHENTICATED_ROUTES = ["/dashboard"] as const;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isLegacyAuthenticatedPath(pathname: string): boolean {
  return LEGACY_AUTHENTICATED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
