import { db } from "../../../lib/db";
import { getLogger } from "../../../lib/logging";
import {
  SecurityEventType,
  SecurityEventSeverity,
} from "../../../lib/security/monitoring";
import { getCurrentUser } from "../../../lib/auth";

const logger = getLogger();

export async function GET({ request, cookies }) {
  try {
    // Get current user session
    const user = await getCurrentUser(cookies);

    // Only allow admin users to access security events
    if (!user || user.role !== "admin") {
      return new Response(
        JSON.stringify({
          error: "Unauthorized access",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const severity = url.searchParams.get("severity");
    const timeRange = url.searchParams.get("timeRange");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const page = parseInt(url.searchParams.get("page") || "1", 10);

    // Build query parts
    const queryParts = ["SELECT * FROM security_events WHERE 1=1"];
    const queryParams = [];
    let paramIndex = 1;

    // Filter by type
    if (
      type &&
      type !== "all" &&
      Object.values(SecurityEventType).includes(type as SecurityEventType)
    ) {
      queryParts.push(`AND type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    // Filter by severity
    if (
      severity &&
      severity !== "all" &&
      Object.values(SecurityEventSeverity).includes(
        severity as SecurityEventSeverity,
      )
    ) {
      queryParts.push(`AND severity = $${paramIndex}`);
      queryParams.push(severity);
      paramIndex++;
    }

    // Filter by time range
    if (timeRange && timeRange !== "all") {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case "day":
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      queryParts.push(`AND created_at >= $${paramIndex}`);
      queryParams.push(startDate.toISOString());
      paramIndex++;
    }

    // Add order by and pagination
    queryParts.push("ORDER BY created_at DESC");
    queryParts.push(`LIMIT $${paramIndex}`);
    queryParams.push(limit);
    paramIndex++;

    queryParts.push(`OFFSET $${paramIndex}`);
    queryParams.push((page - 1) * limit);

    // Execute the query
    const result = await db.query(queryParts.join(" "), queryParams);

    // Transform results to match the SecurityEvent interface
    const events = result.rows.map((row) => ({
      type: row.type as SecurityEventType,
      userId: row.user_id,
      ip: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      severity: row.severity as SecurityEventSeverity,
      timestamp: row.created_at,
    }));

    // Log the API request
    logger.info("Security events fetched", {
      userId: user.id,
      filters: { type, severity, timeRange },
      resultCount: events.length,
    });

    // Return the events
    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error
    logger.error("Error fetching security events", error);

    // Return error response
    return new Response(
      JSON.stringify({
        error: "Failed to fetch security events",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
