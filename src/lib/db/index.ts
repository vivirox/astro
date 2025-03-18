// Export all database utilities
export * from './conversations';
export * from './messages';
export * from './user-settings';

// Export a unified database interface
import * as conversationsDb from './conversations';
import * as messagesDb from './messages';
import * as userSettingsDb from './user-settings';

export const db = {
  conversations: conversationsDb,
  messages: messagesDb,
  userSettings: userSettingsDb,
}; 