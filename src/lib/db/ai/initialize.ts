import { initializeAITables } from "./schema";
import { createAuditLog } from "../../audit/log";

/**
 * Initialize the AI database tables
 * This should be called during application startup
 */
export async function initializeAIDatabase() {
  try {
    console.log("Initializing AI database tables...");

    // Initialize tables
    await initializeAITables();

    // Log successful initialization
    await createAuditLog({
      userId: "system",
      action: "system.ai.database.initialize",
      resource: "database",
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    console.log("AI database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize AI database:", error);

    // Log initialization failure
    await createAuditLog({
      userId: "system",
      action: "system.ai.database.initialize.error",
      resource: "database",
      priority: "high",
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });

    throw error;
  }
}
