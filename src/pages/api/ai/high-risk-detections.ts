import { type APIRoute } from "astro";
import { getSession } from "../../../lib/auth/session";
import { aiRepository } from "../../../lib/db/ai";
import { createAuditLog } from "../../../lib/audit/log";

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Verify session
    const session = await getSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user has admin permissions
    if (!session.user.isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse query parameters
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Log the request
    await createAuditLog({
      userId: session.user.id,
      action: "ai.crisis.high-risk.request",
      resource: "ai",
      metadata: {
        limit,
        offset,
      },
    });

    // Retrieve high-risk crisis detections
    const detections = await aiRepository.getHighRiskCrisisDetections(
      limit,
      offset,
    );

    // Return the results
    return new Response(JSON.stringify({ detections }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error retrieving high-risk crisis detections:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
