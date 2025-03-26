import type { APIRoute } from 'astro'
import * as processModule from 'node:process'
import { createClient } from '@supabase/supabase-js'

/**
 * Health check API endpoin
 *
 * This endpoint will check:
 * 1. API server availability
 * 2. Supabase connection (if credentials available)
 * 3. System resources
 */
export const GET: APIRoute = async () => {
  try {
    // Check database connection
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

    // Check memory usage
    const memoryUsage = processModule.memoryUsage()
    const usedMemoryPercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

    const memoryInfo = {
      percentage: usedMemoryPercentage.toFixed(2),
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    }

    // If no Supabase credentials, return partial health status
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        'Health check: Missing Supabase credentials, skipping database check',
      )

      return new Response(
        JSON.stringify({
          status: 'partial',
          message: 'API available but database connection not configured',
          checks: {
            api: 'ok',
            database: 'skipped',
            memory: usedMemoryPercentage < 85 ? 'ok' : 'warning',
            memoryUsage: memoryInfo,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      )
    }

    // Create Supabase client if credentials are available
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Simple query to check database connection
    const { error } = await supabase
      .from('health_checks')
      .select('count')
      .limit(1)

    if (error) {
      return new Response(
        JSON.stringify({
          status: 'degraded',
          message: 'Database connection error',
          error: error?.message,
          checks: {
            api: 'ok',
            database: 'error',
            memory: usedMemoryPercentage < 85 ? 'ok' : 'warning',
            memoryUsage: memoryInfo,
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Log a successful health check (useful for metrics)
    console.warn(`Health check successful at ${new Date().toISOString()}`)

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
          memoryUsage: memoryInfo,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error('Health check failed:', error)

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error?.message : 'Unknown error',
        checks: {
          api: 'error',
          database: 'unknown',
          memory: 'unknown',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
