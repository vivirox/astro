import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Get the current user before signing out for audit logging
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    let userId = null;
    if (accessToken && refreshToken) {
      try {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        userId = data.user?.id;
      } catch (error) {
        console.error("Error getting user session:", error);
        // Continue with signout even if we can't get the user ID
      }
    }

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return new Response(error.message, { status: 500 });
    }

    // Clear cookies
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });

    // Log the sign out for HIPAA compliance
    if (userId) {
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "user_signed_out",
        resource: "auth",
        resource_id: userId,
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });

      if (auditError) {
        console.error("Audit logging error:", auditError);
        // Continue anyway, as this is just logging
      }
    }

    return redirect("/signin?signedout=true");
  } catch (error) {
    console.error("Sign out error:", error);
    return new Response("An unexpected error occurred", { status: 500 });
  }
};
