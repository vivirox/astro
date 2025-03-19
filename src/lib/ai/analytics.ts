import { db } from "../db";
import { createAuditLog } from "../audit";

/**
 * Interface for AI usage statistics
 */
export interface AIUsageStat {
  date: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  modelUsage: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
    }
  >;
}

/**
 * Options for retrieving AI usage statistics
 */
export interface AIUsageStatsOptions {
  period: "daily" | "weekly" | "monthly";
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(
  options: AIUsageStatsOptions,
): Promise<AIUsageStat[]> {
  const {
    period = "daily",
    userId,
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
    endDate = new Date(),
    limit = 30,
  } = options;

  try {
    // Log the analytics request
    await createAuditLog({
      action: "ai.analytics.request",
      category: "ai",
      status: "success",
      userId: userId,
      details: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit,
      },
    });

    // Query the database for AI usage logs
    const query = db
      .query()
      .select([
        // Select appropriate date grouping based on period
        period === "daily"
          ? db.sql`DATE(created_at)`
          : period === "weekly"
            ? db.sql`DATE_TRUNC('week', created_at)`
            : db.sql`DATE_TRUNC('month', created_at)`,
        "model",
        db.sql`COUNT(*) as request_count`,
        db.sql`SUM(input_tokens) as input_tokens`,
        db.sql`SUM(output_tokens) as output_tokens`,
        db.sql`SUM(total_tokens) as total_tokens`,
        db.sql`SUM(cost) as total_cost`,
      ])
      .from("ai_usage_logs")
      .where("created_at", ">=", startDate)
      .where("created_at", "<=", endDate)
      .groupBy(["date_trunc", "model"])
      .orderBy("date_trunc", "desc")
      .limit(limit);

    // Add user filter if specified
    if (userId) {
      query.where("user_id", "=", userId);
    }

    const results = await query.execute();

    // Process and format the results
    const statsByDate: Record<string, AIUsageStat> = {};

    for (const row of results) {
      const date = row.date_trunc;
      const model = row.model;
      const requests = Number(row.request_count);
      const tokens = Number(row.total_tokens);
      const cost = Number(row.total_cost);

      // Initialize the date entry if it doesn't exist
      if (!statsByDate[date]) {
        statsByDate[date] = {
          date,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          modelUsage: {},
        };
      }

      // Update totals
      statsByDate[date].totalRequests += requests;
      statsByDate[date].totalTokens += tokens;
      statsByDate[date].totalCost += cost;

      // Update model usage
      if (!statsByDate[date].modelUsage[model]) {
        statsByDate[date].modelUsage[model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }

      statsByDate[date].modelUsage[model].requests += requests;
      statsByDate[date].modelUsage[model].tokens += tokens;
      statsByDate[date].modelUsage[model].cost += cost;
    }

    // Convert to array and sort by date
    return Object.values(statsByDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error("Error retrieving AI usage statistics:", error);

    // Log the error
    await createAuditLog({
      action: "ai.analytics.error",
      category: "ai",
      status: "error",
      details: {
        error: error instanceof Error ? error.message : String(error),
        period,
        userId,
      },
    });

    throw error;
  }
}

/**
 * Get model usage breakdown
 */
export async function getModelUsageBreakdown(
  options: AIUsageStatsOptions,
): Promise<
  Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
      percentage: number;
    }
  >
> {
  const stats = await getAIUsageStats(options);

  // Aggregate model usage across all dates
  const modelUsage: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
      percentage: number;
    }
  > = {};

  let totalRequests = 0;

  // First pass: calculate totals
  for (const stat of stats) {
    totalRequests += stat.totalRequests;

    for (const [model, usage] of Object.entries(stat.modelUsage)) {
      if (!modelUsage[model]) {
        modelUsage[model] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          percentage: 0,
        };
      }

      modelUsage[model].requests += usage.requests;
      modelUsage[model].tokens += usage.tokens;
      modelUsage[model].cost += usage.cost;
    }
  }

  // Second pass: calculate percentages
  if (totalRequests > 0) {
    for (const model of Object.keys(modelUsage)) {
      modelUsage[model].percentage =
        (modelUsage[model].requests / totalRequests) * 100;
    }
  }

  return modelUsage;
}

/**
 * Get usage trends over time
 */
export async function getUsageTrends(options: AIUsageStatsOptions): Promise<{
  dates: string[];
  requests: number[];
  tokens: number[];
  costs: number[];
}> {
  const stats = await getAIUsageStats(options);

  // Sort by date ascending
  stats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    dates: stats.map((stat) => stat.date),
    requests: stats.map((stat) => stat.totalRequests),
    tokens: stats.map((stat) => stat.totalTokens),
    costs: stats.map((stat) => stat.totalCost),
  };
}
