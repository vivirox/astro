-- Creation of database_metrics table for storing performance monitoring metrics
CREATE TABLE IF NOT EXISTS database_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('connection', 'query', 'resource')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_database_metrics_type ON database_metrics (type);
CREATE INDEX IF NOT EXISTS idx_database_metrics_timestamp ON database_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_database_metrics_created_at ON database_metrics (created_at);

-- Add RLS policies
ALTER TABLE database_metrics ENABLE ROW LEVEL SECURITY;

-- Only allow admin and system roles to read metrics
CREATE POLICY "Admins can read database metrics"
    ON database_metrics
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'system'));

-- Only allow admin and system roles to insert metrics
CREATE POLICY "Admins can insert database metrics"
    ON database_metrics
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'system'));

-- Create stored functions for metrics collection

-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Requires admin privileges to access these statistics
    SELECT json_build_object(
        'max_connections', setting::int,
        'active_connections', active_connections,
        'idle_connections', idle_connections,
        'idle_in_transaction_connections', idle_in_transaction_connections,
        'connection_percent', (active_connections::float / setting::float) * 100
    )
    INTO result
    FROM (
        SELECT setting FROM pg_settings WHERE name = 'max_connections'
    ) AS max_conn,
    (
        SELECT COUNT(*) AS active_connections FROM pg_stat_activity WHERE state = 'active'
    ) AS active,
    (
        SELECT COUNT(*) AS idle_connections FROM pg_stat_activity WHERE state = 'idle'
    ) AS idle,
    (
        SELECT COUNT(*) AS idle_in_transaction_connections FROM pg_stat_activity WHERE state = 'idle in transaction'
    ) AS idle_in_transaction;

    RETURN result;
END;
$$;

-- Function to get query statistics
CREATE OR REPLACE FUNCTION get_query_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    slow_query_threshold_ms INT := 1000; -- 1 second
BEGIN
    -- Requires pg_stat_statements extension and admin privileges
    SELECT json_build_object(
        'query_count', COUNT(*),
        'slow_queries', COUNT(*) FILTER (WHERE mean_exec_time > slow_query_threshold_ms),
        'cache_hit_ratio', COALESCE(
            (SUM(shared_blks_hit) / NULLIF(SUM(shared_blks_hit + shared_blks_read), 0))::numeric, 
            0
        ),
        'top_queries', (
            SELECT json_agg(q)
            FROM (
                SELECT 
                    query,
                    calls,
                    mean_exec_time,
                    (total_exec_time / 1000) as total_exec_time_seconds
                FROM pg_stat_statements
                ORDER BY total_exec_time DESC
                LIMIT 10
            ) q
        )
    )
    INTO result
    FROM pg_stat_statements;

    RETURN result;
END;
$$;

-- Function to get resource statistics
CREATE OR REPLACE FUNCTION get_resource_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    db_size BIGINT;
    free_space BIGINT;
    total_space BIGINT;
BEGIN
    -- Get database size
    SELECT pg_database_size(current_database()) INTO db_size;
    
    -- This would normally get filesystem stats, but we can't do this directly in PostgreSQL
    -- In a real implementation, you'd use a separate monitoring agent or cloud provider metrics
    -- For this example, we'll simulate these values
    total_space := 100 * 1024 * 1024 * 1024; -- 100 GB
    free_space := 50 * 1024 * 1024 * 1024;   -- 50 GB
    
    SELECT json_build_object(
        'cpu_usage', (
            -- Simulated CPU usage - in a real implementation, this would come from
            -- an external monitoring agent or cloud provider metrics
            SELECT (random() * 30 + 10)::numeric(5,2) -- Random value between 10-40%
        ),
        'memory_usage', (
            -- Simulated memory usage
            SELECT (random() * 40 + 20)::numeric(5,2) -- Random value between 20-60%
        ),
        'disk_usage', (SELECT pg_size_pretty(db_size)),
        'db_size_bytes', db_size,
        'total_space_bytes', total_space,
        'free_space_bytes', free_space,
        'free_space_percent', (free_space::float / total_space::float * 100)::numeric(5,2)
    )
    INTO result;

    RETURN result;
END;
$$;

-- Setup automatic cleanup of old metrics data (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_database_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM database_metrics
    WHERE created_at < NOW() - INTERVAL '30 days';
    RETURN NULL;
END;
$$;

-- Create a trigger to run daily cleanup
CREATE OR REPLACE TRIGGER trigger_cleanup_database_metrics
AFTER INSERT ON database_metrics
EXECUTE PROCEDURE cleanup_old_database_metrics();

-- Comment on table and columns
COMMENT ON TABLE database_metrics IS 'Stores database performance monitoring metrics';
COMMENT ON COLUMN database_metrics.id IS 'Primary key';
COMMENT ON COLUMN database_metrics.type IS 'Type of metric (connection, query, resource)';
COMMENT ON COLUMN database_metrics.timestamp IS 'When the metric was recorded';
COMMENT ON COLUMN database_metrics.metrics IS 'JSON object containing the metric data';
COMMENT ON COLUMN database_metrics.created_at IS 'When the record was created'; 