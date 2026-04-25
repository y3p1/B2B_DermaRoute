import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "provider" | "clinic";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  clinicName?: string;
  active: boolean;
}

export interface AuthenticatedUser extends User {
  role: UserRole;
  profile: UserProfile;
}

/**
 * Middleware helper to check user role
 * Use this in API routes to protect endpoints by role
 */
export async function withRole(
  request: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  allowedRoles: UserRole[]
): Promise<NextResponse> {

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  // Check if user has required role
  if (!allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: `Access denied. Required roles: ${allowedRoles.join(", ")}` },
      { status: 403 }
    );
  }

  // User is authorized, call the handler
  return handler(request, { ...user, role: profile.role, profile });
}

/**
 * Middleware helper to require admin role
 */
export async function withAdmin(
  request: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(request, handler, ["admin"]);
}

/**
 * Middleware helper to require provider or clinic role
 */
export async function withProviderOrClinic(
  request: NextRequest,
  handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(request, handler, ["provider", "clinic"]);
}
