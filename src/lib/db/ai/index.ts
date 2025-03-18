export * from './types';
export * from './schema';
export * from './repository';
export * from './initialize';

// Export a singleton instance of the repository
import { AIRepository } from './repository';
export const aiRepository = new AIRepository(); 