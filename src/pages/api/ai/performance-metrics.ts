import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { createAuditLog } from '../../../lib/audit';
import { requireAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Require authentication and admin role
    const user = await requireAuth(request, cookies, { requiredRole: 'admin' });
    
    // Get query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'daily';
    const startDate = url.searchParams.get('startDate') 
      ? new Date(url.searchParams.get('startDate')!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = url.searchParams.get('endDate') 
      ? new Date(url.searchParams.get('endDate')!) 
      : new Date();
    const model = url.searchParams.get('model') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    
    // Log the analytics request
    await createAuditLog({
      action: 'ai.performance.metrics.request',
      category: 'ai',
      status: 'success',
      userId: user.id,
      details: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        model,
        limit
      }
    });
    
    // Build the query
    let query = db.query()
      .select([
        // Select appropriate date grouping based on period
        period === 'daily' 
          ? db.sql`DATE(timestamp)` 
          : period === 'weekly' 
            ? db.sql`DATE_TRUNC('week', timestamp)` 
            : db.sql`DATE_TRUNC('month', timestamp)`,
        'model',
        db.sql`COUNT(*) as request_count`,
        db.sql`AVG(latency) as avg_latency`,
        db.sql`MAX(latency) as max_latency`,
        db.sql`MIN(latency) as min_latency`,
        db.sql`SUM(input_tokens) as total_input_tokens`,
        db.sql`SUM(output_tokens) as total_output_tokens`,
        db.sql`SUM(total_tokens) as total_tokens`,
        db.sql`SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count`,
        db.sql`SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cached_count`,
        db.sql`SUM(CASE WHEN optimized = 1 THEN 1 ELSE 0 END) as optimized_count`
      ])
      .from('ai_performance_metrics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .groupBy(['date_trunc', 'model'])
      .orderBy('date_trunc', 'desc')
      .limit(limit);
    
    // Add model filter if specified
    if (model) {
      query = query.where('model', '=', model);
    }
    
    const results = await query.execute();
    
    // Process and format the results
    const metrics = results.map(row => ({
      date: row.date_trunc,
      model: row.model,
      requestCount: Number(row.request_count),
      latency: {
        avg: Number(row.avg_latency),
        max: Number(row.max_latency),
        min: Number(row.min_latency)
      },
      tokens: {
        input: Number(row.total_input_tokens),
        output: Number(row.total_output_tokens),
        total: Number(row.total_tokens)
      },
      successRate: Number(row.success_count) / Number(row.request_count),
      cacheHitRate: Number(row.cached_count) / Number(row.request_count),
      optimizationRate: Number(row.optimized_count) / Number(row.request_count)
    }));
    
    // Get model breakdown
    const modelBreakdown = await db.query()
      .select([
        'model',
        db.sql`COUNT(*) as request_count`,
        db.sql`SUM(total_tokens) as total_tokens`,
        db.sql`SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count`,
        db.sql`SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cached_count`,
        db.sql`SUM(CASE WHEN optimized = 1 THEN 1 ELSE 0 END) as optimized_count`
      ])
      .from('ai_performance_metrics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .groupBy(['model'])
      .orderBy('request_count', 'desc')
      .execute();
    
    // Get error breakdown
    const errorBreakdown = await db.query()
      .select([
        'error_code',
        db.sql`COUNT(*) as error_count`
      ])
      .from('ai_performance_metrics')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .where('success', '=', false)
      .groupBy(['error_code'])
      .orderBy('error_count', 'desc')
      .execute();
    
    // Return the metrics
    return new Response(JSON.stringify({
      metrics,
      modelBreakdown: modelBreakdown.map(row => ({
        model: row.model,
        requestCount: Number(row.request_count),
        totalTokens: Number(row.total_tokens),
        successRate: Number(row.success_count) / Number(row.request_count),
        cacheHitRate: Number(row.cached_count) / Number(row.request_count),
        optimizationRate: Number(row.optimized_count) / Number(row.request_count)
      })),
      errorBreakdown: errorBreakdown.map(row => ({
        errorCode: row.error_code,
        count: Number(row.error_count)
      }))
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching AI performance metrics:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch AI performance metrics',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 