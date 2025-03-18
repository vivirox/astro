import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * Health check API endpoint
 * 
 * This endpoint will check:
 * 1. API server availability
 * 2. Supabase connection
 * 3. System resources
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Check database connection
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing Supabase credentials',
          checks: {
            api: 'ok',
            database: 'error',
            memory: 'unknown',
          },
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Simple query to check database connection
    const { error } = await supabase.from('health_checks').select('count').limit(1);
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const usedMemoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (error) {
      return new Response(
        JSON.stringify({
          status: 'degraded',
          message: 'Database connection error',
          error: error.message,
          checks: {
            api: 'ok',
            database: 'error',
            memory: usedMemoryPercentage < 85 ? 'ok' : 'warning',
            memoryUsage: {
              percentage: usedMemoryPercentage.toFixed(2),
              heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
              heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
            }
          },
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Log a successful health check (useful for metrics)
    console.info(`Health check successful at ${new Date().toISOString()}`);
    
    // All checks passed
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'All systems operational',
        timestamp: new Date().toISOString(),
        checks: {
          api: 'ok',
          database: 'ok',
          memory: usedMemoryPercentage < 85 ? 'ok' : 'warning',
          memoryUsage: {
            percentage: usedMemoryPercentage.toFixed(2),
            heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          }
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {
          api: 'error',
          database: 'unknown',
          memory: 'unknown',
        },
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}; 