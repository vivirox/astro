import type { AstroCookies } from "astro";
import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

/**
 * Get the current authenticated user from cookies
 */
export async function getCurrentUser(
  cookies: AstroCookies,
): Promise<AuthUser | null> {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  try {
    // Set the session using the tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.user) {
      console.error("Session error:", error);
      return null;
    }

    // Get the user's profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    // Return user with profile data
    return {
      id: data.user.id,
      email: data.user.email || "",
      role: profileData?.role || "user",
      fullName: profileData?.full_name || data.user.user_metadata?.full_name,
      avatarUrl: profileData?.avatar_url || data.user.user_metadata?.avatar_url,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(cookies: AstroCookies): Promise<boolean> {
  const user = await getCurrentUser(cookies);
  return !!user;
}

/**
 * Check if the user has the required role
 */
export async function hasRole(
  cookies: AstroCookies,
  requiredRole: string,
): Promise<boolean> {
  const user = await getCurrentUser(cookies);
  if (!user) return false;

  // Simple role check - can be expanded for more complex role hierarchies
  if (requiredRole === "admin") {
    return user.role === "admin";
  }

  if (requiredRole === "staff") {
    return user.role === "admin" || user.role === "staff";
  }

  return true; // All authenticated users have the basic 'user' role
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: any,
  request?: Request,
): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource,
      resource_id: resourceId || null,
      metadata: metadata || null,
      ip_address:
        request?.headers.get("x-forwarded-for") ||
        request?.headers.get("x-real-ip"),
      user_agent: request?.headers.get("user-agent"),
    });

    if (error) {
      console.error("Audit logging error:", error);
    }
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}

/**
 * Require authentication for a route
 */
export async function requireAuth({
  cookies,
  redirect,
  request,
}: {
  cookies: AstroCookies;
  redirect: Function;
  request: Request;
}) {
  const user = await getCurrentUser(cookies);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.url);
    return redirect(loginUrl.toString());
  }

  return null;
}
