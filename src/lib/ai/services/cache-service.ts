import type { AICompletionRequest, AICompletionResponse } from '../models/ai-types';
import crypto from 'crypto';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /**
   * Maximum number of items to store in cache
   * @default 100
   */
  maxSize?: number;
  
  /**
   * Time-to-live in milliseconds
   * @default 5 minutes
   */
  ttl?: number;
  
  /**
   * Whether to enable the cache
   * @default true
   */
  enabled?: boolean;
}

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  response: AICompletionResponse;
  timestamp: number;
  hits: number;
}

/**
 * AI Request Cache Service
 * 
 * Provides caching for AI completion requests to reduce API calls
 * and improve response times for frequently used prompts.
 */
export class AICacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number;
  private enabled: boolean;
  
  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 100;
    this.ttl = config.ttl || 5 * 60 * 1000; // 5 minutes default
    this.enabled = config.enabled !== false;
  }
  
  /**
   * Generate a cache key from a request
   */
  private generateKey(request: AICompletionRequest): string {
    // Don't cache streaming requests
    if (request.stream) {
      return '';
    }
    
    // Create a deterministic hash of the request
    const requestData = JSON.stringify({
      messages: request.messages,
      model: request.model,
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens
    });
    
    return crypto
      .createHash('md5')
      .update(requestData)
      .digest('hex');
  }
  
  /**
   * Get a cached response if available
   */
  get(request: AICompletionRequest): AICompletionResponse | null {
    if (!this.enabled) return null;
    
    const key = this.generateKey(request);
    if (!key) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    
    return entry.response;
  }
  
  /**
   * Store a response in the cache
   */
  set(request: AICompletionRequest, response: AICompletionResponse): void {
    if (!this.enabled) return;
    
    const key = this.generateKey(request);
    if (!key) return;
    
    // Add to cache
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hits: 1
    });
    
    // Enforce max size by removing least recently used items
    if (this.cache.size > this.maxSize) {
      this.evictLeastUsed();
    }
  }
  
  /**
   * Remove the least used cache entries
   */
  private evictLeastUsed(): void {
    // Sort entries by hits (ascending)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);
    
    // Remove 10% of least used entries
    const removeCount = Math.max(1, Math.floor(this.maxSize * 0.1));
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      enabled: this.enabled,
      ttl: this.ttl
    };
  }
} 