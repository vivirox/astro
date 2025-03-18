import { type User } from '../../auth/types';

/**
 * Base interface for all AI analysis results
 */
export interface BaseAnalysisResult {
  id: string;
  userId: string;
  user?: User;
  createdAt: Date;
  updatedAt: Date;
  modelId: string;
  modelProvider: string;
  requestTokens: number;
  responseTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysisResult extends BaseAnalysisResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Crisis detection result
 */
export interface CrisisDetectionResult extends BaseAnalysisResult {
  text: string;
  crisisDetected: boolean;
  crisisType?: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sensitivityLevel: number;
  metadata: Record<string, any>;
}

/**
 * Therapeutic response generation result
 */
export interface ResponseGenerationResult extends BaseAnalysisResult {
  prompt: string;
  response: string;
  context?: string;
  instructions?: string;
  temperature: number;
  maxTokens: number;
  metadata: Record<string, any>;
}

/**
 * Intervention analysis result
 */
export interface InterventionAnalysisResult extends BaseAnalysisResult {
  conversation: string;
  intervention: string;
  userResponse: string;
  effectiveness: number;
  insights: string;
  recommendedFollowUp?: string;
  metadata: Record<string, any>;
}

/**
 * AI usage statistics
 */
export interface AIUsageStats {
  userId: string;
  user?: User;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  modelUsage: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
} 