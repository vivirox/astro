import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

/**
 * Initialize security tables in the database
 */
export async function initializeSecurityTables(): Promise<void> {
  try {
    // Create security_events table
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(_50) NOT NULL,
        user_id VARCHAR(_255),
        ip_address VARCHAR(_50),
        user_agent TEXT,
        metadata JSONB,
        severity VARCHAR(_20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `,
    })

    // Create indexes for better query performance
    await supabaseAdmin.rpc('exec_sql', {
      query: `
      CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events (type);
      CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events (severity);
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at);
    `,
    })

    console.log('Security tables initialized successfully')
  } catch (error) {
    console.error(
      'Failed to initialize security tables:',
      error instanceof Error ? error : new Error(String(error)),
    )
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Initialize security database
 */
export async function initializeSecurityDatabase(): Promise<void> {
  try {
    await initializeSecurityTables()
  } catch (error) {
    console.error(
      'Failed to initialize security database:',
      error instanceof Error ? error : new Error(String(error)),
    )
    throw error instanceof Error ? error : new Error(String(error))
  }
}
