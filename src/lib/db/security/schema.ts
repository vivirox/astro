import { db } from "../index";

/**
 * Initialize security tables in the database
 */
export async function initializeSecurityTables(): Promise<void> {
  try {
    // Create security_events table
    await db.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        user_id VARCHAR(255),
        ip_address VARCHAR(50),
        user_agent TEXT,
        metadata JSONB,
        severity VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for better query performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events (type);
      CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events (severity);
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at);
    `);

    console.log("Security tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize security tables:", error);
    throw error;
  }
}

/**
 * Initialize security database
 */
export async function initializeSecurityDatabase(): Promise<void> {
  try {
    await initializeSecurityTables();
  } catch (error) {
    console.error("Failed to initialize security database:", error);
    throw error;
  }
}
