import { TogetherAIProvider } from './providers/together';
import type { AIService } from './services/ai-service';
import { createAdvancedOptimizedAIService, AdvancedPerformanceOptions } from './performance-optimizations';
import { createOptimizedAIService } from './performance';

export interface AIServiceFactoryOptions {
  provider: 'together';
  apiKey?: string;
  baseUrl?: string;
  enableOptimization?: boolean;
  enableAdvancedOptimization?: boolean;
  advancedPerformanceOptions?: AdvancedPerformanceOptions;
}

/**
 * Create an AI service
 */
export function createAIService(options: AIServiceFactoryOptions = { provider: 'together' }): AIService {
  let service: AIService;

  // Create TogetherAI provider
  service = new TogetherAIProvider({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl
  });

  // Apply optimizations if enabled
  if (options.enableAdvancedOptimization) {
    // Apply advanced optimizations
    return createAdvancedOptimizedAIService(service, options.advancedPerformanceOptions);
  } else if (options.enableOptimization !== false) {
    // Apply standard optimizations (enabled by default)
    return createOptimizedAIService(service);
  }

  // Return the base service without optimizations
  return service;
} 