import { AIService } from './ai-service';
import { AIMessage, SentimentResult } from '../models/types';
import { getDefaultModelForCapability } from '../models/registry';

/**
 * Sentiment Analysis Service Configuration
 */
export interface SentimentAnalysisConfig {
  aiService: AIService;
  model?: string;
  defaultPrompt?: string;
}

/**
 * Sentiment Analysis Service Implementation
 */
export class SentimentAnalysisService {
  private aiService: AIService;
  private model: string;
  private defaultPrompt: string;

  constructor(config: SentimentAnalysisConfig) {
    this.aiService = config.aiService;
    this.model = config.model || getDefaultModelForCapability('sentiment').id;
    this.defaultPrompt = config.defaultPrompt || 
      `Analyze the sentiment of the following text. Provide a score from -1 (very negative) to 1 (very positive), 
      a label (negative, neutral, or positive), and a confidence score from 0 to 1. 
      Also identify the emotions present in the text with their intensity scores from 0 to 1.
      
      Return the result as a JSON object with the following structure:
      {
        "score": number,
        "label": "negative" | "neutral" | "positive",
        "confidence": number,
        "emotions": {
          "joy": number,
          "sadness": number,
          "anger": number,
          "fear": number,
          "surprise": number,
          "disgust": number
        }
      }`;
  }

  /**
   * Analyze the sentiment of a text
   */
  async analyzeSentiment(text: string, customPrompt?: string): Promise<SentimentResult> {
    const prompt = customPrompt || this.defaultPrompt;
    
    const messages: AIMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ];

    const response = await this.aiService.createChatCompletion(messages, {
      model: this.model,
      temperature: 0.1 // Low temperature for more consistent results
    });

    try {
      // Extract JSON from response
      const content = response.message.content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonStr);

      // Validate and normalize the result
      return {
        score: Number(result.score),
        label: result.label as 'negative' | 'neutral' | 'positive',
        confidence: Number(result.confidence),
        emotions: result.emotions
      };
    } catch (error) {
      console.error('Error parsing sentiment analysis result:', error);
      throw new Error('Failed to parse sentiment analysis result');
    }
  }

  /**
   * Analyze the sentiment of multiple texts
   */
  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map(text => this.analyzeSentiment(text)));
  }
} 