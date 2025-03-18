import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseGenerationService } from '../../lib/ai/services/response-generation';
import type { AIService, AIMessage } from '../../lib/ai/types';

// Mock AI service
const mockAIService: AIService = {
  createChatCompletion: vi.fn(),
  createStreamingChatCompletion: vi.fn(),
  getModelInfo: vi.fn()
};

describe('ResponseGenerationService', () => {
  let responseService: ResponseGenerationService;
  
  beforeEach(() => {
    vi.resetAllMocks();
    responseService = new ResponseGenerationService({
      aiService: mockAIService,
      model: 'test-model'
    });
  });
  
  describe('generateResponse', () => {
    it('should generate a response correctly', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a generated response.',
        model: 'test-model',
        usage: { total_tokens: 100, prompt_tokens: 70, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      const result = await responseService.generateResponse(messages);
      
      // Verify the result
      expect(result).toEqual({
        response: 'This is a generated response.',
        model: 'test-model',
        processingTime: expect.any(Number),
        usage: { total_tokens: 100, prompt_tokens: 70, completion_tokens: 30 }
      });
      
      // Verify the AI service was called with correct parameters
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hello, how are you?' })
        ]),
        expect.objectContaining({ model: 'test-model' })
      );
    });
    
    it('should use custom temperature when provided', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a generated response.',
        model: 'test-model',
        usage: { total_tokens: 100, prompt_tokens: 70, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      await responseService.generateResponse(messages, { temperature: 0.2 });
      
      // Verify the AI service was called with custom temperature
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ 
          model: 'test-model',
          temperature: 0.2
        })
      );
    });
    
    it('should use custom max tokens when provided', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a generated response.',
        model: 'test-model',
        usage: { total_tokens: 100, prompt_tokens: 70, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      await responseService.generateResponse(messages, { maxResponseTokens: 500 });
      
      // Verify the AI service was called with custom max tokens
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ 
          model: 'test-model',
          max_tokens: 500
        })
      );
    });
    
    it('should use custom system prompt when provided', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a generated response.',
        model: 'test-model',
        usage: { total_tokens: 100, prompt_tokens: 70, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      const customPrompt = 'Custom system prompt';
      await responseService.generateResponse(messages, { systemPrompt: customPrompt });
      
      // Verify the AI service was called with custom system prompt
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system', 
            content: customPrompt
          })
        ]),
        expect.any(Object)
      );
    });
    
    it('should handle AI service errors', async () => {
      // Mock the AI service to throw an error
      (mockAIService.createChatCompletion as any).mockRejectedValue(new Error('AI service error'));
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      await expect(responseService.generateResponse(messages)).rejects.toThrow('AI service error');
    });
    
    it('should handle conversation history correctly', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a response to the conversation.',
        model: 'test-model',
        usage: { total_tokens: 150, prompt_tokens: 120, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' },
        { role: 'assistant', content: 'I\'m doing well, thank you! How can I help you today?' },
        { role: 'user', content: 'I have a question about therapy.' }
      ];
      
      await responseService.generateResponse(messages);
      
      // Verify the AI service was called with all messages
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hello, how are you?' }),
          expect.objectContaining({ role: 'assistant', content: 'I\'m doing well, thank you! How can I help you today?' }),
          expect.objectContaining({ role: 'user', content: 'I have a question about therapy.' })
        ]),
        expect.any(Object)
      );
    });
  });
  
  describe('generateResponseWithInstructions', () => {
    it('should combine instructions with system prompt', async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: 'This is a response with instructions.',
        model: 'test-model',
        usage: { total_tokens: 120, prompt_tokens: 90, completion_tokens: 30 }
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      const instructions = 'Respond in a very concise manner.';
      await responseService.generateResponseWithInstructions(messages, instructions);
      
      // Verify the AI service was called with combined system prompt
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system', 
            content: expect.stringContaining(instructions)
          })
        ]),
        expect.any(Object)
      );
    });
  });
  
  describe('generateStreamingResponse', () => {
    it('should handle streaming responses correctly', async () => {
      // Create a mock for the streaming response
      const mockStream = {
        [Symbol.asyncIterator]: () => {
          const chunks = [
            { content: 'This ' },
            { content: 'is ' },
            { content: 'a ' },
            { content: 'streaming ' },
            { content: 'response.' }
          ];
          let index = 0;
          
          return {
            next: async () => {
              if (index < chunks.length) {
                return { done: false, value: chunks[index++] };
              } else {
                return { done: true, value: undefined };
              }
            }
          };
        }
      };
      
      // Mock the AI service streaming response
      (mockAIService.createStreamingChatCompletion as any).mockResolvedValue({
        stream: mockStream,
        model: 'test-model'
      });
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      // Create a mock callback
      const mockCallback = vi.fn();
      
      const result = await responseService.generateStreamingResponse(messages, mockCallback);
      
      // Verify the result
      expect(result).toEqual({
        response: 'This is a streaming response.',
        model: 'test-model',
        processingTime: expect.any(Number)
      });
      
      // Verify the callback was called for each chunk
      expect(mockCallback).toHaveBeenCalledTimes(5);
      expect(mockCallback).toHaveBeenNthCalledWith(1, 'This ');
      expect(mockCallback).toHaveBeenNthCalledWith(2, 'is ');
      expect(mockCallback).toHaveBeenNthCalledWith(3, 'a ');
      expect(mockCallback).toHaveBeenNthCalledWith(4, 'streaming ');
      expect(mockCallback).toHaveBeenNthCalledWith(5, 'response.');
      
      // Verify the AI service was called with correct parameters
      expect(mockAIService.createStreamingChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hello, how are you?' })
        ]),
        expect.objectContaining({ model: 'test-model' })
      );
    });
    
    it('should handle streaming errors', async () => {
      // Mock the AI service to throw an error
      (mockAIService.createStreamingChatCompletion as any).mockRejectedValue(new Error('Streaming error'));
      
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello, how are you?' }
      ];
      
      const mockCallback = vi.fn();
      
      await expect(responseService.generateStreamingResponse(messages, mockCallback)).rejects.toThrow('Streaming error');
    });
  });
  
  describe('constructor', () => {
    it('should use default model if not provided', () => {
      const service = new ResponseGenerationService({
        aiService: mockAIService
      });
      
      // Use a non-public method to test the model
      expect((service as any).config.model).toBe('gpt-4o');
    });
    
    it('should use default temperature if not provided', () => {
      const service = new ResponseGenerationService({
        aiService: mockAIService
      });
      
      expect((service as any).config.temperature).toBe(0.7);
    });
    
    it('should use default max tokens if not provided', () => {
      const service = new ResponseGenerationService({
        aiService: mockAIService
      });
      
      expect((service as any).config.maxResponseTokens).toBe(1000);
    });
    
    it('should use custom system prompt if provided', () => {
      const customPrompt = 'Custom system prompt';
      const service = new ResponseGenerationService({
        aiService: mockAIService,
        systemPrompt: customPrompt
      });
      
      expect((service as any).config.systemPrompt).toBe(customPrompt);
    });
  });
}); 