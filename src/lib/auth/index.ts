// Re-export session functions
export { getSession, createSession, endSession } from "./session";
export type { SessionData } from "./session";

// Export ZK authentication
export * from "./types";
export * from "./middleware";
export * from "./zkAuth";
