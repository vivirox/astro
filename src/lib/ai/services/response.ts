import { Message, ResponseGenerationConfig, AIServiceResponse } from "../types";
import { TogetherAIService } from "./together";

/**
 * Service for generating therapeutic responses
 */
export class ResponseGenerationService {
  private aiService: TogetherAIService;
  public config: ResponseGenerationConfig;

  /**
   * Create a new response generation service
   * @param config The service configuration
   */
  constructor(config: ResponseGenerationConfig) {
    this.aiService = config.aiService;
    this.config = {
      aiService: config.aiService,
      model: config.model || "mistralai/Mixtral-8x7B-Instruct-v0.1",
      temperature: config.temperature || 0.5,
      maxResponseTokens: config.maxResponseTokens || 1024,
    };
  }

  /**
   * Generate a response to a message with context
   * @param currentMessage The current message to respond to
   * @param previousMessages Previous messages for context
   * @param instructions Custom instructions for the response
   * @returns The generated response
   */
  async generate(
    currentMessage: string,
    previousMessages: { role: "user" | "assistant"; content: string }[] = [],
    instructions?: string,
  ): Promise<AIServiceResponse> {
    try {
      // Format messages for the AI service
      const messages: Message[] = [];

      // Add system instructions if provided
      if (instructions) {
        messages.push({
          role: "system",
          content: instructions,
        });
      } else {
        // Default system message
        messages.push({
          role: "system",
          content:
            "You are a helpful assistant providing thoughtful, accurate, and supportive responses.",
        });
      }

      // Add previous messages for context
      for (const msg of previousMessages) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add the current message
      messages.push({
        role: "user",
        content: currentMessage,
      });

      // Generate the response
      return await this.aiService.generateCompletion(messages, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxResponseTokens,
      });
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  }

  /**
   * Generate a response from a list of messages
   * @param messages The messages to generate a response from
   * @param instructions Custom instructions for the response
   * @returns The generated response
   */
  async generateFromMessages(
    messages: Message[],
    instructions?: string,
  ): Promise<AIServiceResponse> {
    try {
      // Create a copy of the messages
      const formattedMessages = [...messages];

      // Add system instructions if provided and not already present
      if (
        instructions &&
        !formattedMessages.some((msg) => msg.role === "system")
      ) {
        formattedMessages.unshift({
          role: "system",
          content: instructions,
        });
      } else if (!formattedMessages.some((msg) => msg.role === "system")) {
        // Add default system message if none exists
        formattedMessages.unshift({
          role: "system",
          content:
            "You are a helpful assistant providing thoughtful, accurate, and supportive responses.",
        });
      }

      // Generate the response
      return await this.aiService.generateCompletion(formattedMessages, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxResponseTokens,
      });
    } catch (error) {
      console.error("Error generating response from messages:", error);
      throw error;
    }
  }
}
