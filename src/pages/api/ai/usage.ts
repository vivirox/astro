import type { APIRoute } from "astro";
import { getSession } from "../../../lib/auth";
import { getAIUsageStats } from "../../../lib/ai/usage";
import { createAuditLog } from "../../../lib/audit";
import { handleApiError } from "../../../lib/ai/error-handling";
import { validateQueryParams } from "../../../lib/validation";
import { UsageStatsRequestSchema } from "../../../lib/validation/schemas";

/**
 * API route for AI usage statistics
 * Secured by authentication and input validation
 * Rate limited to prevent abuse
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify session
    const session = await getSession(cookies);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Check if user has admin access for all users data
    const isAdmin = session.user.role === "admin";

    // Validate query parameters
    const [params, validationError] = validateQueryParams(
      request.url,
      UsageStatsRequestSchema,
    );

    if (validationError) {
      // Create audit log for validation error
      await createAuditLog({
        action: "ai.usage.validation_error",
        category: "ai",
        status: "error",
        userId: session.user?.id,
        details: {
          error: validationError.error,
          details: validationError.details,
        },
      });

      return new Response(JSON.stringify(validationError), {
        status: validationError.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Only allow admins to view all users' data
    if (params.allUsers && !isAdmin) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "You do not have permission to view all users data",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Create audit log for the request
    await createAuditLog({
      action: "ai.usage.request",
      category: "ai",
      status: "success",
      userId: session.user?.id,
      details: {
        period: params.period,
        allUsers: params.allUsers,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });

    // Get usage statistics
    const stats = await getAIUsageStats({
      period: params.period,
      userId: params.allUsers ? undefined : session.user.id,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    });

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Error in AI usage API:", error);

    // Create audit log for the error
    await createAuditLog({
      action: "ai.usage.error",
      category: "ai",
      status: "error",
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Use standardized error handling
    return handleApiError(error);
  }
};
