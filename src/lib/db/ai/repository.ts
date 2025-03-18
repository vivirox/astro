import { supabase, AI_TABLES } from './schema';
import type {
  SentimentAnalysisResult,
  CrisisDetectionResult,
  ResponseGenerationResult,
  InterventionAnalysisResult,
  AIUsageStats
} from './types';

/**
 * Repository for AI analysis results
 */
export class AIRepository {
  /**
   * Store a sentiment analysis result
   */
  async storeSentimentAnalysis(result: Omit<SentimentAnalysisResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from(AI_TABLES.SENTIMENT_ANALYSIS)
      .insert({
        user_id: result.userId,
        model_id: result.modelId,
        model_provider: result.modelProvider,
        request_tokens: result.requestTokens,
        response_tokens: result.responseTokens,
        total_tokens: result.totalTokens,
        latency_ms: result.latencyMs,
        success: result.success,
        error: result.error,
        text: result.text,
        sentiment: result.sentiment,
        score: result.score,
        confidence: result.confidence,
        metadata: result.metadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing sentiment analysis:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Store a crisis detection result
   */
  async storeCrisisDetection(result: Omit<CrisisDetectionResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from(AI_TABLES.CRISIS_DETECTION)
      .insert({
        user_id: result.userId,
        model_id: result.modelId,
        model_provider: result.modelProvider,
        request_tokens: result.requestTokens,
        response_tokens: result.responseTokens,
        total_tokens: result.totalTokens,
        latency_ms: result.latencyMs,
        success: result.success,
        error: result.error,
        text: result.text,
        crisis_detected: result.crisisDetected,
        crisis_type: result.crisisType,
        confidence: result.confidence,
        risk_level: result.riskLevel,
        sensitivity_level: result.sensitivityLevel,
        metadata: result.metadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing crisis detection:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Store a response generation result
   */
  async storeResponseGeneration(result: Omit<ResponseGenerationResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from(AI_TABLES.RESPONSE_GENERATION)
      .insert({
        user_id: result.userId,
        model_id: result.modelId,
        model_provider: result.modelProvider,
        request_tokens: result.requestTokens,
        response_tokens: result.responseTokens,
        total_tokens: result.totalTokens,
        latency_ms: result.latencyMs,
        success: result.success,
        error: result.error,
        prompt: result.prompt,
        response: result.response,
        context: result.context,
        instructions: result.instructions,
        temperature: result.temperature,
        max_tokens: result.maxTokens,
        metadata: result.metadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing response generation:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Store an intervention analysis result
   */
  async storeInterventionAnalysis(result: Omit<InterventionAnalysisResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const { data, error } = await supabase
      .from(AI_TABLES.INTERVENTION_ANALYSIS)
      .insert({
        user_id: result.userId,
        model_id: result.modelId,
        model_provider: result.modelProvider,
        request_tokens: result.requestTokens,
        response_tokens: result.responseTokens,
        total_tokens: result.totalTokens,
        latency_ms: result.latencyMs,
        success: result.success,
        error: result.error,
        conversation: result.conversation,
        intervention: result.intervention,
        user_response: result.userResponse,
        effectiveness: result.effectiveness,
        insights: result.insights,
        recommended_follow_up: result.recommendedFollowUp,
        metadata: result.metadata
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing intervention analysis:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Update or create AI usage statistics
   */
  async updateUsageStats(stats: Omit<AIUsageStats, 'id'>): Promise<void> {
    const { error } = await supabase
      .from(AI_TABLES.USAGE_STATS)
      .upsert({
        user_id: stats.userId,
        period: stats.period,
        date: stats.date.toISOString().split('T')[0],
        total_requests: stats.totalRequests,
        total_tokens: stats.totalTokens,
        total_cost: stats.totalCost,
        model_usage: stats.modelUsage
      }, {
        onConflict: 'user_id, period, date'
      });

    if (error) {
      console.error('Error updating AI usage stats:', error);
      throw error;
    }
  }

  /**
   * Get sentiment analysis results for a user
   */
  async getSentimentAnalysisByUser(userId: string, limit = 10, offset = 0): Promise<SentimentAnalysisResult[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.SENTIMENT_ANALYSIS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting sentiment analysis:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      modelId: item.model_id,
      modelProvider: item.model_provider,
      requestTokens: item.request_tokens,
      responseTokens: item.response_tokens,
      totalTokens: item.total_tokens,
      latencyMs: item.latency_ms,
      success: item.success,
      error: item.error,
      text: item.text,
      sentiment: item.sentiment as 'positive' | 'negative' | 'neutral',
      score: item.score,
      confidence: item.confidence,
      metadata: item.metadata || {}
    }));
  }

  /**
   * Get crisis detection results for a user
   */
  async getCrisisDetectionByUser(userId: string, limit = 10, offset = 0): Promise<CrisisDetectionResult[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.CRISIS_DETECTION)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting crisis detection:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      modelId: item.model_id,
      modelProvider: item.model_provider,
      requestTokens: item.request_tokens,
      responseTokens: item.response_tokens,
      totalTokens: item.total_tokens,
      latencyMs: item.latency_ms,
      success: item.success,
      error: item.error,
      text: item.text,
      crisisDetected: item.crisis_detected,
      crisisType: item.crisis_type,
      confidence: item.confidence,
      riskLevel: item.risk_level as 'low' | 'medium' | 'high' | 'critical',
      sensitivityLevel: item.sensitivity_level,
      metadata: item.metadata || {}
    }));
  }

  /**
   * Get response generation results for a user
   */
  async getResponseGenerationByUser(userId: string, limit = 10, offset = 0): Promise<ResponseGenerationResult[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.RESPONSE_GENERATION)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting response generation:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      modelId: item.model_id,
      modelProvider: item.model_provider,
      requestTokens: item.request_tokens,
      responseTokens: item.response_tokens,
      totalTokens: item.total_tokens,
      latencyMs: item.latency_ms,
      success: item.success,
      error: item.error,
      prompt: item.prompt,
      response: item.response,
      context: item.context,
      instructions: item.instructions,
      temperature: item.temperature,
      maxTokens: item.max_tokens,
      metadata: item.metadata || {}
    }));
  }

  /**
   * Get intervention analysis results for a user
   */
  async getInterventionAnalysisByUser(userId: string, limit = 10, offset = 0): Promise<InterventionAnalysisResult[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.INTERVENTION_ANALYSIS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting intervention analysis:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      modelId: item.model_id,
      modelProvider: item.model_provider,
      requestTokens: item.request_tokens,
      responseTokens: item.response_tokens,
      totalTokens: item.total_tokens,
      latencyMs: item.latency_ms,
      success: item.success,
      error: item.error,
      conversation: item.conversation,
      intervention: item.intervention,
      userResponse: item.user_response,
      effectiveness: item.effectiveness,
      insights: item.insights,
      recommendedFollowUp: item.recommended_follow_up,
      metadata: item.metadata || {}
    }));
  }

  /**
   * Get AI usage statistics for a user
   */
  async getUsageStatsByUser(userId: string, period: 'daily' | 'weekly' | 'monthly', limit = 30): Promise<AIUsageStats[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.USAGE_STATS)
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting AI usage stats:', error);
      throw error;
    }

    return data.map(item => ({
      userId: item.user_id,
      period: item.period as 'daily' | 'weekly' | 'monthly',
      date: new Date(item.date),
      totalRequests: item.total_requests,
      totalTokens: item.total_tokens,
      totalCost: item.total_cost,
      modelUsage: item.model_usage
    }));
  }

  /**
   * Get AI usage statistics for all users (admin only)
   */
  async getAllUsageStats(period: 'daily' | 'weekly' | 'monthly', limit = 30): Promise<AIUsageStats[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.USAGE_STATS)
      .select('*')
      .eq('period', period)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting all AI usage stats:', error);
      throw error;
    }

    return data.map(item => ({
      userId: item.user_id,
      period: item.period as 'daily' | 'weekly' | 'monthly',
      date: new Date(item.date),
      totalRequests: item.total_requests,
      totalTokens: item.total_tokens,
      totalCost: item.total_cost,
      modelUsage: item.model_usage
    }));
  }

  /**
   * Get crisis detections with high risk level (admin only)
   */
  async getHighRiskCrisisDetections(limit = 20, offset = 0): Promise<CrisisDetectionResult[]> {
    const { data, error } = await supabase
      .from(AI_TABLES.CRISIS_DETECTION)
      .select('*')
      .in('risk_level', ['high', 'critical'])
      .eq('crisis_detected', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting high risk crisis detections:', error);
      throw error;
    }

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      modelId: item.model_id,
      modelProvider: item.model_provider,
      requestTokens: item.request_tokens,
      responseTokens: item.response_tokens,
      totalTokens: item.total_tokens,
      latencyMs: item.latency_ms,
      success: item.success,
      error: item.error,
      text: item.text,
      crisisDetected: item.crisis_detected,
      crisisType: item.crisis_type,
      confidence: item.confidence,
      riskLevel: item.risk_level as 'low' | 'medium' | 'high' | 'critical',
      sensitivityLevel: item.sensitivity_level,
      metadata: item.metadata || {}
    }));
  }
} 