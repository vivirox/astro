import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterventionAnalysisService } from '../../lib/ai/services/intervention-analysis';
import type { AIService, AIMessage } from '../../lib/ai/types';

// Mock AI service
const mockAIService: AIService = {
  createChatCompletion: vi.fn(),
  createStreamingChatCompletion: vi.fn(),
  getModelInfo: vi.fn()
};

describe('InterventionAnalysisService', () => {
  let interventionService: InterventionAnalysisService;
  
  beforeEach(() => {
    vi.resetAllMocks();
    interventionService = new InterventionAnalysisService({
      aiService: mockAIService,
      model: 'test-model'
    });
  });
  
  describe('analyzeIntervention', () => {
    it('should analyze intervention effectiveness correctly', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          effectiveness_score: 8,
          user_receptiveness: 'high',
          emotional_impact: 'positive',
          key_insights: [
            'The intervention was well-timed',
            'The user responded positively to validation'
          ],
          improvement_suggestions: [
            'Could provide more specific coping strategies'
          ]
        }),
        model: 'test-model',
        usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
      });
      
      // Create test conversation
      const conversation: AIMessage[] = [
        { role: 'user', content: 'I\'ve been feeling really anxious lately.' },
        { role: 'assistant', content: 'I understand that anxiety can be challenging. What specific situations trigger your anxiety?' }
      ];
      
      const interventionMessage: AIMessage = {
        role: 'assistant',
        content: 'It sounds like you\'re experiencing some significant anxiety. Have you considered trying mindfulness techniques to help manage these feelings?'
      };
      
      const userResponse: AIMessage = {
        role: 'user',
        content: 'That\'s a good idea. I\'ve heard about mindfulness but haven\'t really tried it consistently. Do you have any specific exercises you would recommend?'
      };
      
      const result = await interventionService.analyzeIntervention(
        conversation,
        interventionMessage,
        userResponse
      );
      
      // Verify the result
      expect(result).toEqual({
        effectiveness_score: 8,
        user_receptiveness: 'high',
        emotional_impact: 'positive',
        key_insights: [
          'The intervention was well-timed',
          'The user responded positively to validation'
        ],
        improvement_suggestions: [
          'Could provide more specific coping strategies'
        ],
        model: 'test-model',
        processingTime: expect.any(Number)
      });
      
      // Verify the AI service was called with correct parameters
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ 
            role: 'user', 
            content: expect.stringContaining('analyze the effectiveness')
          })
        ]),
        expect.objectContaining({ model: 'test-model' })
      );
    });
    
    it('should handle custom analysis prompt', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          effectiveness_score: 7,
          user_receptiveness: 'medium',
          emotional_impact: 'neutral',
          key_insights: ['Custom analysis insight'],
          improvement_suggestions: ['Custom improvement suggestion']
        }),
        model: 'test-model',
        usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
      });
      
      // Create test conversation
      const conversation: AIMessage[] = [
        { role: 'user', content: 'Test message' }
      ];
      
      const interventionMessage: AIMessage = {
        role: 'assistant',
        content: 'Test intervention'
      };
      
      const userResponse: AIMessage = {
        role: 'user',
        content: 'Test response'
      };
      
      const customPrompt = 'Focus on analyzing the therapeutic alliance in this intervention.';
      
      await interventionService.analyzeIntervention(
        conversation,
        interventionMessage,
        userResponse,
        { customPrompt }
      );
      
      // Verify the AI service was called with custom prompt
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'user', 
            content: expect.stringContaining(customPrompt)
          })
        ]),
        expect.any(Object)
      );
    });
    
    it('should handle invalid JSON responses', async () => {
      // Mock the AI service response with invalid JSON
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'Not a valid JSON response',
        model: 'test-model',
        usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
      });
      
      // Create test conversation
      const conversation: AIMessage[] = [
        { role: 'user', content: 'Test message' }
      ];
      
      const interventionMessage: AIMessage = {
        role: 'assistant',
        content: 'Test intervention'
      };
      
      const userResponse: AIMessage = {
        role: 'user',
        content: 'Test response'
      };
      
      await expect(interventionService.analyzeIntervention(
        conversation,
        interventionMessage,
        userResponse
      )).rejects.toThrow();
    });
    
    it('should handle AI service errors', async () => {
      // Mock the AI service to throw an error
      (mockAIService.createChatCompletion as any).mockRejectedValue(new Error('AI service error'));
      
      // Create test conversation
      const conversation: AIMessage[] = [
        { role: 'user', content: 'Test message' }
      ];
      
      const interventionMessage: AIMessage = {
        role: 'assistant',
        content: 'Test intervention'
      };
      
      const userResponse: AIMessage = {
        role: 'user',
        content: 'Test response'
      };
      
      await expect(interventionService.analyzeIntervention(
        conversation,
        interventionMessage,
        userResponse
      )).rejects.toThrow('AI service error');
    });
  });
  
  describe('analyzeBatch', () => {
    it('should analyze multiple interventions in parallel', async () => {
      // Mock the AI service response for multiple calls
      (mockAIService.createChatCompletion as any)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            effectiveness_score: 8,
            user_receptiveness: 'high',
            emotional_impact: 'positive',
            key_insights: ['First insight'],
            improvement_suggestions: ['First suggestion']
          }),
          model: 'test-model',
          usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            effectiveness_score: 6,
            user_receptiveness: 'medium',
            emotional_impact: 'neutral',
            key_insights: ['Second insight'],
            improvement_suggestions: ['Second suggestion']
          }),
          model: 'test-model',
          usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
        });
      
      // Create test interventions
      const interventions = [
        {
          conversation: [{ role: 'user', content: 'First conversation' }] as AIMessage[],
          intervention: { role: 'assistant', content: 'First intervention' } as AIMessage,
          response: { role: 'user', content: 'First response' } as AIMessage
        },
        {
          conversation: [{ role: 'user', content: 'Second conversation' }] as AIMessage[],
          intervention: { role: 'assistant', content: 'Second intervention' } as AIMessage,
          response: { role: 'user', content: 'Second response' } as AIMessage
        }
      ];
      
      const results = await interventionService.analyzeBatch(interventions);
      
      // Verify the results
      expect(results).toHaveLength(2);
      expect(results[0].effectiveness_score).toBe(8);
      expect(results[1].effectiveness_score).toBe(6);
      
      // Verify the AI service was called twice
      expect(mockAIService.createChatCompletion).toHaveBeenCalledTimes(2);
    });
    
    it('should handle errors in batch processing', async () => {
      // Mock the AI service to succeed for first call and fail for second
      (mockAIService.createChatCompletion as any)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            effectiveness_score: 8,
            user_receptiveness: 'high',
            emotional_impact: 'positive',
            key_insights: ['First insight'],
            improvement_suggestions: ['First suggestion']
          }),
          model: 'test-model',
          usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
        })
        .mockRejectedValueOnce(new Error('AI service error'));
      
      // Create test interventions
      const interventions = [
        {
          conversation: [{ role: 'user', content: 'First conversation' }] as AIMessage[],
          intervention: { role: 'assistant', content: 'First intervention' } as AIMessage,
          response: { role: 'user', content: 'First response' } as AIMessage
        },
        {
          conversation: [{ role: 'user', content: 'Second conversation' }] as AIMessage[],
          intervention: { role: 'assistant', content: 'Second intervention' } as AIMessage,
          response: { role: 'user', content: 'Second response' } as AIMessage
        }
      ];
      
      await expect(interventionService.analyzeBatch(interventions)).rejects.toThrow();
    });
  });
  
  describe('constructor', () => {
    it('should use default model if not provided', () => {
      const service = new InterventionAnalysisService({
        aiService: mockAIService
      });
      
      // Use a non-public method to test the model
      expect((service as any).config.model).toBe('gpt-4o');
    });
    
    it('should use custom system prompt if provided', () => {
      const customPrompt = 'Custom system prompt';
      const service = new InterventionAnalysisService({
        aiService: mockAIService,
        systemPrompt: customPrompt
      });
      
      expect((service as any).config.systemPrompt).toBe(customPrompt);
    });
  });
}); 