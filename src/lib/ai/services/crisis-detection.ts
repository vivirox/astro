import type { AIService, AIMessage } from '../models/types'
import type { CrisisDetectionResult } from '../types'
import { getDefaultModelForCapability } from '../models/registry'

/**
 * Crisis Detection Service Configuration
 */
export interface CrisisDetectionConfig {
  aiService: AIService
  model?: string
  defaultPrompt?: string
  sensitivityLevel?: 'low' | 'medium' | 'high'
}

/**
 * Crisis Detection Service Implementation
 */
export class CrisisDetectionService {
  private aiService: AIService
  private model: string
  private defaultPrompt: string
  private sensitivityLevel: 'low' | 'medium' | 'high'

  constructor(config: CrisisDetectionConfig) {
    this.aiService = config.aiService
    this.model =
      config.model ||
      getDefaultModelForCapability('crisis')?.id ||
      'mistralai/Mixtral-8x7B-Instruct-v0.1'
    this.sensitivityLevel = config.sensitivityLevel || 'medium'

    this.defaultPrompt =
      config.defaultPrompt ||
      `You are a crisis detection system designed to identify potential crisis situations in text.
      Analyze the following text for signs of:
      - Self-harm or suicidal ideation
      - Harm to others
      - Abuse or violence
      - Medical emergencies
      - Severe psychological distress

      The current sensitivity level is set to: ${this.sensitivityLevel.toUpperCase()}

      LOW sensitivity: Only flag the most explicit and clear threats or emergencies.
      MEDIUM sensitivity: Flag explicit threats and strong indicators of crisis.
      HIGH sensitivity: Flag both explicit threats and subtle indicators of potential crisis.

      Return the result as a JSON object with the following structure:
      {
        "isCrisis": boolean,
        "confidence": number, // 0 to 1
        "category": string, // e.g., "self-harm", "suicide", "harm_to_others", "abuse", "medical_emergency", "psychological_distress"
        "severity": "low" | "medium" | "high",
        "recommendedAction": string // Explanation of the reasoning behind the result
      }`
  }

  /**
   * Detect crisis in text
   */
  async detectCrisis(
    text: string,
    options?: {
      sensitivityLevel?: 'low' | 'medium' | 'high'
      customPrompt?: string
    }
  ): Promise<CrisisDetectionResult> {
    const sensitivityLevel = options?.sensitivityLevel || this.sensitivityLevel
    let prompt = options?.customPrompt || this.defaultPrompt

    // Update sensitivity level in prompt if different from default
    if (sensitivityLevel !== this.sensitivityLevel && !options?.customPrompt) {
      prompt = prompt.replace(
        `The current sensitivity level is set to: ${this.sensitivityLevel.toUpperCase()}`,
        `The current sensitivity level is set to: ${sensitivityLevel.toUpperCase()}`
      )
    }

    const messages: AIMessage[] = [
      { role: 'system', content: prompt, name: '' },
      { role: 'user', content: text, name: '' },
    ]

    const response = await this.aiService.createChatCompletion(messages, {
      model: this.model,
    })

    try {
      // Extract JSON from response
      const content = response?.choices?.[0]?.message?.content || ''
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/) ||
        content.match(/{[\s\S]*?}/)

      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const result = JSON.parse(jsonStr)

      // Validate and normalize the result
      return {
        isCrisis: Boolean(result?.isCrisis),
        confidence: Number(result?.confidence),
        category: result?.category,
        severity: (result?.severity as 'low' | 'medium' | 'high') || 'none',
        recommendedAction: result?.recommendedAction,
        content: text,
      }
    } catch (error) {
      console.error('Error parsing crisis detection result:', error)
      throw new Error('Failed to parse crisis detection result')
    }
  }

  /**
   * Detect crisis in multiple texts
   */
  async detectBatch(
    texts: string[],
    options?: {
      sensitivityLevel?: 'low' | 'medium' | 'high'
    }
  ): Promise<CrisisDetectionResult[]> {
    return Promise.all(texts.map((text) => this.detectCrisis(text, options)))
  }

  /**
   * Set the sensitivity level for crisis detection
   */
  setSensitivityLevel(level: 'low' | 'medium' | 'high'): void {
    this.sensitivityLevel = level
  }
}
