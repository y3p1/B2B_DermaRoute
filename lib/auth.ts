import { supabase } from "@/lib/supabaseClient";

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

/**
 * Get the current user's profile with role information
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === role;
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile ? roles.includes(profile.role) : false;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole("admin");
}

/**
 * Check if the current user is a provider
 */
export async function isProvider(): Promise<boolean> {
  return hasRole("provider");
}

/**
 * Check if the current user is a clinic
 */
export async function isClinic(): Promise<boolean> {
  return hasRole("clinic");
}

/**
 * Require a specific role, throw error if not authorized
 */
export async function requireRole(role: UserRole): Promise<UserProfile> {
  const profile = await getCurrentUserProfile();
  
  if (!profile) {
    throw new Error("Not authenticated");
  }

  if (profile.role !== role) {
    throw new Error(`Access denied. Required role: ${role}`);
  }

  return profile;
}

/**
 * Require any of the specified roles, throw error if not authorized
 */
export async function requireAnyRole(roles: UserRole[]): Promise<UserProfile> {
  const profile = await getCurrentUserProfile();
  
  if (!profile) {
    throw new Error("Not authenticated");
  }

  if (!roles.includes(profile.role)) {
    throw new Error(`Access denied. Required roles: ${roles.join(", ")}`);
  }

  return profile;
}
