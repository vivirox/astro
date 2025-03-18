import { db } from '../db';
import { logAuditEvent } from '../auth';

export interface PerformanceMetric {
  model: string;
  latency: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success: boolean;
  error_code?: string;
  cached: boolean;
  optimized: boolean;
  user_id?: string;
  session_id?: string;
  request_id: string;
}

/**
 * Track AI performance metrics in the database
 */
export async function trackPerformance(metric: PerformanceMetric): Promise<void> {
  try {
    await db.query(`
      INSERT INTO ai_performance_metrics (
        model, 
        latency, 
        input_tokens, 
        output_tokens, 
        total_tokens, 
        success, 
        error_code, 
        cached, 
        optimized, 
        user_id, 
        session_id, 
        request_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
    `, [
      metric.model,
      metric.latency,
      metric.input_tokens,
      metric.output_tokens,
      metric.total_tokens,
      metric.success,
      metric.error_code || null,
      metric.cached,
      metric.optimized,
      metric.user_id || null,
      metric.session_id || null,
      metric.request_id
    ]);

    // Log audit event for tracking purposes
    if (metric.user_id) {
      await logAuditEvent(
        metric.user_id,
        'track_ai_performance',
        'ai_service',
        metric.request_id,
        {
          model: metric.model,
          success: metric.success,
          cached: metric.cached,
          optimized: metric.optimized
        }
      );
    }
  } catch (error) {
    console.error('Error tracking AI performance:', error);
  }
}

/**
 * Get performance metrics for a specific model
 */
export async function getModelPerformance(model: string, days: number = 30): Promise<any> {
  try {
    const result = await db.query(`
      SELECT 
        AVG(latency) as avg_latency,
        AVG(total_tokens) as avg_tokens,
        COUNT(*) as request_count,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cached_count,
        SUM(CASE WHEN optimized = true THEN 1 ELSE 0 END) as optimized_count
      FROM ai_performance_metrics
      WHERE model = $1
      AND timestamp > NOW() - INTERVAL '${days} days'
    `, [model]);

    return result.rows[0];
  } catch (error) {
    console.error('Error getting model performance:', error);
    return null;
  }
}

/**
 * Get overall AI performance metrics
 */
export async function getOverallPerformance(days: number = 30): Promise<any> {
  try {
    const result = await db.query(`
      SELECT 
        AVG(latency) as avg_latency,
        AVG(total_tokens) as avg_tokens,
        COUNT(*) as request_count,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN cached = true THEN 1 ELSE 0 END) as cached_count,
        SUM(CASE WHEN optimized = true THEN 1 ELSE 0 END) as optimized_count,
        COUNT(DISTINCT model) as model_count
      FROM ai_performance_metrics
      WHERE timestamp > NOW() - INTERVAL '${days} days'
    `);

    return result.rows[0];
  } catch (error) {
    console.error('Error getting overall performance:', error);
    return null;
  }
} 