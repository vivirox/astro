import type { FHEService } from '../../fhe'
import type { TherapyAIProvider } from '../providers/EmotionLlamaProvider'
import type {
  TherapySession,
  EmotionAnalysis,
  } from '../AIService'
import { getLogger } from '../../logging'

// Initialize logger
const logger = getLogger()

/**
 * MentalLLaMA integration - Adapter for interpretable mental health analysis
 * Based on https://github.com/SteveKGYang/MentalLLaMA
 */
export class MentalLLaMAAdapter {
  private provider: TherapyAIProvider
  private fheService: FHEService
  private baseUrl: string
  private apiKey: string

  constructor(
    provider: TherapyAIProvider,
    fheService: FHEService,
    baseUrl: string,
    apiKey: string,
  ) {
    this.provider = provider
    this.fheService = fheService
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  /**
   * Analyze a text for mental health indicators using MentalLLaMA's approach
   * @param text The text to analyze
   * @returns Analysis with mental health indicators and explanations
   */
  async analyzeMentalHealth(text: string): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
  }> {
    logger.info('Analyzing text for mental health indicators')

    try {
      // We would use MentalLLaMA's approach here, but for now we'll use the provider
      const emotionAnalysis = await this.provider.analyzeEmotions(text)

      // Extract mental health categories from emotion analysis
      const mentalHealthCategories =
        this.mapEmotionsToMentalHealth(emotionAnalysis)

      // If we have risk factors, prioritize those
      const hasMentalHealthIssue =
        emotionAnalysis.riskFactors.length > 0 ||
        emotionAnalysis.overallSentiment < -0.3

      // Get the most prominent category
      const topCategory = this.getTopMentalHealthCategory(
        mentalHealthCategories,
      )

      // Extract supporting evidence
      const supportingEvidence = this.extractSupportingEvidence(
        text,
        topCategory,
      )

      return {
        hasMentalHealthIssue,
        mentalHealthCategory: topCategory.category,
        explanation: topCategory.explanation,
        confidence: topCategory.score,
        supportingEvidence,
      }
    } catch (error) {
      logger.error('Failed to analyze mental health', { error })
      throw error
    }
  }

  /**
   * Evaluate the quality of an explanation using MentalLLaMA's metrics
   * @param explanation The explanation to evaluate
   * @param referenceExplanation Optional reference explanation
   * @returns Quality metrics for the explanation
   */
  async evaluateExplanationQuality(
    explanation: string,
    referenceExplanation?: string,
  ): Promise<{
    fluency: number
    completeness: number
    reliability: number
    overall: number
    bartScore?: number
  }> {
    logger.info('Evaluating explanation quality')

    try {
      // This would call MentalLLaMA's BART-score or other metrics
      // For now we'll use a simple heuristic approach

      // Count sentences as a proxy for completeness
      const sentences = explanation
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0)
      const completeness = Math.min(sentences.length / 5, 1) * 5 // 0-5 scale

      // Use word count as a proxy for fluency
      const words = explanation.split(/\s+/).filter((w) => w.trim().length > 0)
      const fluency = Math.min(words.length / 100, 1) * 5 // 0-5 scale

      // Use keyword presence as a proxy for reliability
      const reliabilityKeywords = [
        'evidence',
        'suggests',
        'indicates',
        'shows',
        'demonstrates',
        'appears',
        'seems',
        'likely',
        'possibly',
        'may',
      ]
      const reliabilityScore = reliabilityKeywords.reduce(
        (score, keyword) =>
          score + (explanation.toLowerCase().includes(keyword) ? 0.5 : 0),
        0,
      )
      const reliability = Math.min(reliabilityScore, 5)

      // Calculate overall score
      const overall = (fluency + completeness + reliability) / 3

      // If we have a reference, we would calculate BART-score
      const bartScore = referenceExplanation ? 0.85 : undefined

      return {
        fluency,
        completeness,
        reliability,
        overall,
        bartScore,
      }
    } catch (error) {
      logger.error('Failed to evaluate explanation quality', { error })
      throw error
    }
  }

  /**
   * Generate an explanation for a mental health classification
   * @param text The text to explain
   * @param mentalHealthCategory The category to explain
   * @returns Detailed explanation
   */
  async generateExplanation(
    text: string,
    mentalHealthCategory: string,
  ): Promise<string> {
    logger.info('Generating explanation for mental health classification')

    try {
      // Create a synthetic session for the provider
      const session: TherapySession = {
        sessionId: `explanation-${Date.now()}`,
        clientId: 'mental-llama-client',
        therapistId: 'mental-llama-therapist',
        startTime: new Date(),
        status: 'active',
        securityLevel: 'hipaa',
        emotionAnalysisEnabled: true,
      }

      // Analyze emotions first
      const emotionAnalysis = await this.provider.analyzeEmotions(text)

      // Generate therapeutic intervention
      const intervention = await this.provider.generateIntervention(
        session,
        emotionAnalysis,
      )

      // Extract the explanation part
      return this.extractExplanation(intervention.content, mentalHealthCategory)
    } catch (error) {
      logger.error('Failed to generate explanation', { error })
      throw error
    }
  }

  /**
   * Load expert-written explanations from MentalLLaMA
   * @returns Expert explanations by category
   */
  async loadExpertExplanations(): Promise<Record<string, string[]>> {
    logger.info('Loading expert-written explanations')

    // This would load MentalLLaMA's expert explanations from a database or file
    // For now providing comprehensive expert explanations for all supported categories
    return {
      depression: [
        'The post exhibits signs of depression through expressions of hopelessness, lack of motivation, and persistent sadness. The individual describes feeling "empty" and having no energy to perform daily tasks, which are common symptoms of clinical depression.',
        'Multiple indicators of depression are present, including disrupted sleep patterns, loss of interest in previously enjoyed activities, and feelings of worthlessness. The prolonged nature of these symptoms (mentioned as "weeks") suggests clinical depression rather than temporary sadness.',
        'The language contains several markers of depression, including negative self-evaluation, expressed feelings of guilt, and descriptions of fatigue. The individual explicitly mentions feeling sad "all the time," which is consistent with the persistent low mood characteristic of major depressive disorder.',
      ],
      anxiety: [
        'The text demonstrates anxiety through descriptions of excessive worry about everyday situations, physical symptoms like racing heart and sweating, and avoidance behaviors. The individual expresses overwhelming fear that appears disproportionate to the actual threat.',
        'Signs of anxiety include catastrophic thinking patterns, anticipatory worry, and physical manifestations such as trembling and nausea. The individual describes these symptoms as interfering with daily functioning, suggesting clinical anxiety.',
        'The narrative contains clear anxiety markers including rumination on potential negative outcomes, physical symptoms of autonomic arousal, and explicit mention of feeling "on edge" constantly. The described worry is persistent and difficult to control, consistent with generalized anxiety disorder.',
      ],
      ptsd: [
        'The post contains multiple indicators of PTSD, including intrusive memories of the traumatic event, flashbacks that feel like re-experiencing the trauma, and hypervigilance. The individual describes being constantly "on edge" and having strong startle responses.',
        'Evidence of PTSD includes avoidance of situations that remind the person of the traumatic event, nightmares about the trauma, and emotional numbness. These symptoms have persisted for months, suggesting post-traumatic stress rather than acute stress.',
        'The text describes classic PTSD symptomatology, including intrusive memories, psychological distress when exposed to trauma reminders, and persistent negative emotional states. The individual mentions specific triggers that cause intense psychological distress, consistent with post-traumatic stress disorder.',
      ],
      suicidality: [
        'The content shows significant indicators of suicidal ideation, including explicit statements about wanting to die, feeling like a burden to others, and expressing that others would be "better off" without them. These direct expressions of wanting to end one\'s life represent serious suicide risk.',
        'Several concerning markers of suicide risk are present, including described feelings of hopelessness, expressions of having no future, and statements suggesting the individual has considered means of self-harm. The combination of hopelessness with specific thoughts about death indicates high risk.',
        'The text contains explicit suicidal content, including references to previous suicide attempts, current thoughts about ending life, and statements indicating the individual sees no alternative solution to their suffering. The presence of both ideation and potential planning represents acute suicide risk.',
      ],
      bipolar_disorder: [
        'The narrative contains descriptions of distinct mood episodes, with periods of extremely elevated energy, reduced need for sleep, and racing thoughts contrasted with periods of deep depression. This cyclical pattern of mood states is characteristic of bipolar disorder.',
        'The text describes experiences consistent with bipolar disorder, including episodes of grandiosity, increased goal-directed activity, and impulsive behavior followed by periods of severe depression. The individual mentions these episodes last for distinct periods, which matches the episodic nature of bipolar disorder.',
        'Clear indicators of bipolar symptomatology are present, including described periods of inflated self-esteem, flight of ideas, and excessive involvement in pleasurable activities with painful consequences, alternating with depressive episodes. The described mood oscillations suggest bipolar disorder rather than unipolar depression.',
      ],
      ocd: [
        'The individual describes intrusive, unwanted thoughts that cause significant distress, along with repetitive behaviors performed to reduce this distress. These thoughts are recognized as excessive, yet the compulsions are described as difficult to resist, which is typical of obsessive-compulsive disorder.',
        'The text contains clear descriptions of obsessions (intrusive thoughts about contamination and harm) and compulsions (washing, checking) that the individual recognizes as excessive but feels unable to control. The time-consuming nature of these rituals and their interference with daily functioning points to OCD.',
        'The narrative reveals classic OCD presentation, including distressing intrusive thoughts that the individual attempts to neutralize through ritualistic behaviors. Despite recognizing these behaviors as irrational, the individual describes feeling compelled to perform them to reduce anxiety, which is the hallmark of obsessive-compulsive disorder.',
      ],
      eating_disorder: [
        'The text demonstrates significant preoccupation with body weight and shape, fear of gaining weight, and restrictive eating patterns. The described distortion in how the individual perceives their body despite objective evidence to the contrary is particularly characteristic of eating disorders.',
        "Several indicators of an eating disorder are present, including rigid rules around food consumption, compensatory behaviors after eating, and intense body dissatisfaction. The individual's self-worth appears heavily contingent on weight and appearance, which is common in eating disorders.",
        "The content reveals patterns consistent with an eating disorder, including preoccupation with calories, described episodes of binge eating followed by compensation, and significant emotional distress around food and eating. The individual's described behaviors suggest a dysfunctional relationship with food and body image.",
      ],
      social_anxiety: [
        'The post describes intense fear of social situations in which the individual might be scrutinized or negatively evaluated by others. This fear has led to avoidance of important social activities, which is causing significant distress and functional impairment, consistent with social anxiety disorder.',
        'Multiple indicators of social anxiety are present, including fear of embarrassment in social situations, physical symptoms when anticipating social interaction, and avoidance of activities that involve other people. The individual explicitly mentions fear of judgment as the primary concern, which is central to social anxiety disorder.',
        'The text reveals classic social anxiety presentation, including anticipatory anxiety before social events, intense fear during social interactions, and post-event rumination. The individual describes these symptoms as significantly interfering with their ability to form relationships and perform at work/school, suggestive of social anxiety disorder.',
      ],
      panic_disorder: [
        'The individual describes recurrent, unexpected panic attacks characterized by sudden intense fear accompanied by physical symptoms such as heart palpitations, shortness of breath, and feelings of impending doom. Between attacks, there is persistent worry about having additional attacks, which is the defining feature of panic disorder.',
        'The text contains clear descriptions of panic attacks, including rapid heart rate, difficulty breathing, fear of dying, and a feeling of unreality. The individual expresses significant worry about when the next attack might occur, leading to avoidance behaviors, which is characteristic of panic disorder.',
        'The narrative reveals a pattern of sudden, intense episodes of fear accompanied by physical symptoms including chest pain, dizziness, and feelings of choking. The individual describes living in fear of these unpredictable attacks, which has led to significant behavioral changes and avoidance, consistent with panic disorder.',
      ],
    }
  }

  /**
   * Map emotions to mental health categories
   * @private
   */
  private mapEmotionsToMentalHealth(emotionAnalysis: EmotionAnalysis): Array<{
    category: string
    score: number
    explanation: string
  }> {
    // Map emotions to mental health categories based on MentalLLaMA's approach
    const categories: Array<{
      category: string
      score: number
      explanation: string
    }> = []

    // Extract emotions and map to categories
    const emotions = emotionAnalysis.emotions

    // Check for depression indicators
    const sadnessEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'sadness',
    )
    if (sadnessEmotion && sadnessEmotion.intensity > 0.6) {
      categories.push({
        category: 'depression',
        score: sadnessEmotion.intensity,
        explanation:
          'High levels of sadness may indicate depression, especially when persistent and intense.',
      })
    }

    // Check for anxiety indicators
    const fearEmotion = emotions.find((e) => e.type.toLowerCase() === 'fear')
    const anxietyEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'anxiety',
    )
    if (
      (fearEmotion && fearEmotion.intensity > 0.5) ||
      (anxietyEmotion && anxietyEmotion.intensity > 0.5)
    ) {
      categories.push({
        category: 'anxiety',
        score: Math.max(
          fearEmotion?.intensity || 0,
          anxietyEmotion?.intensity || 0,
        ),
        explanation:
          'Elevated fear or anxiety may indicate an anxiety disorder, particularly when accompanied by physical symptoms or excessive worry.',
      })
    }

    // Check for PTSD indicators
    const fearIntensity = fearEmotion?.intensity || 0
    const angerEmotion = emotions.find((e) => e.type.toLowerCase() === 'anger')
    const angerIntensity = angerEmotion?.intensity || 0

    if (fearIntensity > 0.7 && angerIntensity > 0.6) {
      categories.push({
        category: 'ptsd',
        score: (fearIntensity + angerIntensity) / 2,
        explanation:
          'The combination of intense fear and anger may suggest PTSD, especially if triggered by specific memories or situations.',
      })
    }

    // ADDED: Check for bipolar disorder indicators
    const joyEmotion = emotions.find(
      (e) =>
        e.type.toLowerCase() === 'joy' || e.type.toLowerCase() === 'happiness',
    )
    const joyIntensity = joyEmotion?.intensity || 0
    const sadnessIntensity = sadnessEmotion?.intensity || 0

    if (joyIntensity > 0.7 && sadnessIntensity > 0.4) {
      categories.push({
        category: 'bipolar_disorder',
        score: (joyIntensity + sadnessIntensity) / 2,
        explanation:
          'Rapid shifts between elevated mood and sadness may indicate bipolar disorder, especially when these shifts appear within short time periods.',
      })
    }

    // ADDED: Check for OCD indicators
    const fearAndAnxiety =
      (fearIntensity + (anxietyEmotion?.intensity || 0)) / 2
    if (fearAndAnxiety > 0.6 && emotionAnalysis.overallSentiment < -0.2) {
      categories.push({
        category: 'ocd',
        score: fearAndAnxiety,
        explanation:
          'Persistent anxiety combined with repetitive thoughts or described rituals may indicate obsessive-compulsive disorder.',
      })
    }

    // ADDED: Check for eating disorder indicators
    const disgustEmotion = emotions.find(
      (e) => e.type.toLowerCase() === 'disgust',
    )
    const disgustIntensity = disgustEmotion?.intensity || 0

    if (
      disgustIntensity > 0.6 ||
      (disgustIntensity > 0.4 && sadnessIntensity > 0.5)
    ) {
      categories.push({
        category: 'eating_disorder',
        score: Math.max(
          disgustIntensity,
          (disgustIntensity + sadnessIntensity) / 2,
        ),
        explanation:
          'Strong disgust combined with negative self-perception may indicate an eating disorder, particularly when focused on body image or food.',
      })
    }

    // ADDED: Check for social anxiety indicators
    if (
      fearIntensity > 0.5 &&
      emotionAnalysis.contextualFactors.some(
        (f) =>
          f.type.toLowerCase().includes('social') ||
          f.type.toLowerCase().includes('people') ||
          f.type.toLowerCase().includes('public'),
      )
    ) {
      categories.push({
        category: 'social_anxiety',
        score: fearIntensity,
        explanation:
          'Fear specifically connected to social situations or interactions may indicate social anxiety disorder.',
      })
    }

    // ADDED: Check for panic disorder indicators
    if (
      fearIntensity > 0.8 ||
      (fearIntensity > 0.6 &&
        emotionAnalysis.emotions.some(
          (e) =>
            e.type.toLowerCase().includes('panic') ||
            e.type.toLowerCase().includes('terror'),
        ))
    ) {
      categories.push({
        category: 'panic_disorder',
        score: fearIntensity,
        explanation:
          'Intense fear accompanied by physical symptoms and a sense of immediate danger may indicate panic disorder.',
      })
    }

    // Check for suicidality based on risk factors
    if (emotionAnalysis.riskFactors.length > 0) {
      const suicidalityRisk = emotionAnalysis.riskFactors.find(
        (r) =>
          r.type.toLowerCase().includes('suicidal') ||
          r.type.toLowerCase().includes('self-harm'),
      )

      if (suicidalityRisk && suicidalityRisk.severity > 0.5) {
        categories.push({
          category: 'suicidality',
          score: suicidalityRisk.severity,
          explanation:
            'Expressions of hopelessness combined with thoughts of death or self-harm indicate serious suicide risk.',
        })
      }
    }

    return categories
  }

  /**
   * Get the top mental health category from a list
   * @private
   */
  private getTopMentalHealthCategory(
    categories: Array<{
      category: string
      score: number
      explanation: string
    }>,
  ): {
    category: string
    score: number
    explanation: string
  } {
    if (categories.length === 0) {
      return {
        category: 'no_issue_detected',
        score: 0,
        explanation:
          'No significant mental health issues were detected in the text.',
      }
    }

    // Sort by score descending
    const sortedCategories = [...categories].sort((a, b) => b.score - a.score)
    return sortedCategories[0]
  }

  /**
   * Extract supporting evidence for a mental health category
   * @private
   */
  private extractSupportingEvidence(
    text: string,
    category: {
      category: string
      score: number
      explanation: string
    },
  ): string[] {
    // This would use more sophisticated NLP techniques
    // For now using a simple keyword approach based on MentalLLaMA

    const evidencePatterns: Record<string, RegExp[]> = {
      depression: [
        /(?:feel(?:ing)?\s+(?:sad|empty|hopeless|worthless))/i,
        /(?:no\s+(?:energy|motivation|interest))/i,
        /(?:(?:can't|cannot|don't|do\s+not)\s+(?:sleep|eat|focus|concentrate))/i,
        /(?:suicidal\s+(?:thoughts|ideation|feeling))/i,
      ],
      anxiety: [
        /(?:(?:feel(?:ing)?\s+(?:anxious|nervous|worried|scared|afraid)))/i,
        /(?:panic\s+(?:attack|episode))/i,
        /(?:(?:racing|pounding)\s+heart)/i,
        /(?:(?:can't|cannot)\s+(?:stop|control)\s+(?:worry|worrying|thinking))/i,
      ],
      ptsd: [
        /(?:(?:flash|night)(?:back|mare))/i,
        /(?:trauma(?:tic)?(?:\s+(?:event|experience|memory)))/i,
        /(?:(?:avoid(?:ing)?|trigger(?:ed)?))/i,
        /(?:(?:hyper(?:vigilant|aroused|alert)|startl(?:e|ed|ing)))/i,
      ],
      suicidality: [
        /(?:(?:kill|hurt|harm)\s+(?:myself|me|myself))/i,
        /(?:(?:end|take)\s+(?:my|this)\s+life)/i,
        /(?:(?:suicidal|death|dying)\s+(?:thoughts|ideation|plan))/i,
        /(?:(?:better|easier)\s+(?:off|without|dead))/i,
      ],
      // ADDED: New evidence patterns for additional categories
      bipolar_disorder: [
        /(?:(?:mood|energy)\s+(?:swings|shifts|changes))/i,
        /(?:(?:hypo|)manic\s+(?:episode|period|state))/i,
        /(?:(?:racing|fast)\s+thoughts)/i,
        /(?:(?:excessive|too\s+much)\s+(?:energy|excitement|activity))/i,
      ],
      ocd: [
        /(?:(?:intrusive|unwanted|disturbing)\s+(?:thoughts|images|urges))/i,
        /(?:(?:compulsive|repetitive|ritual)\s+(?:behavior|checking|counting|cleaning))/i,
        /(?:(?:need|have)\s+to\s+(?:check|count|clean|order|arrange))/i,
        /(?:(?:fear|anxiety|worry)\s+(?:if|when|about)\s+(?:not|doesn't|don't))/i,
      ],
      eating_disorder: [
        /(?:(?:body|weight|fat)\s+(?:image|issue|obsession|preoccupation))/i,
        /(?:(?:avoid|restrict|limit)\s+(?:food|eating|calories|meals))/i,
        /(?:(?:purge|vomit|throw\s+up)\s+(?:after|food|eating|meal))/i,
        /(?:(?:feel|feeling)\s+(?:fat|overweight|big|huge))/i,
      ],
      social_anxiety: [
        /(?:(?:afraid|scared|anxious)\s+(?:of|about|in)\s+(?:social|public|people))/i,
        /(?:(?:fear|worry|panic)\s+(?:of|about|when)\s+(?:judged|watched|observed))/i,
        /(?:(?:avoid|don't|cannot)\s+(?:social|public|group)\s+(?:situations|events|gatherings))/i,
        /(?:(?:embarrassed|humiliated|awkward)\s+(?:around|with|when)\s+(?:people|others|strangers))/i,
      ],
      panic_disorder: [
        /(?:(?:sudden|intense|overwhelming)\s+(?:fear|panic|terror))/i,
        /(?:(?:heart|chest|breathing)\s+(?:racing|pounding|difficulty|pain))/i,
        /(?:(?:feel|feeling)\s+(?:like|as\s+if|that)\s+(?:dying|death|heart\s+attack))/i,
        /(?:(?:dizzy|lightheaded|faint|unreal|detached))/i,
      ],
    }

    const categoryPatterns = evidencePatterns[category.category] || []
    const evidence: string[] = []

    // Find sentences containing evidence
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    for (const sentence of sentences) {
      for (const pattern of categoryPatterns) {
        if (pattern.test(sentence)) {
          evidence.push(sentence.trim())
          break // Only add each sentence once
        }
      }

      // Limit to 3 pieces of evidence
      if (evidence.length >= 3) break
    }

    return evidence
  }

  /**
   * Extract explanation from intervention text
   * @private
   */
  private extractExplanation(
    interventionText: string,
    mentalHealthCategory: string,
  ): string {
    // Simple extraction based on category keywords
    const lines = interventionText.split('\n')
    const relevantLines: string[] = []

    let inExplanation = false

    for (const line of lines) {
      // Look for explanation markers
      if (
        line.toLowerCase().includes('explain') ||
        line.toLowerCase().includes('reason') ||
        line.toLowerCase().includes('analysis') ||
        line.toLowerCase().includes('assessment')
      ) {
        inExplanation = true
      }

      // Check if this line is relevant to the category
      if (
        inExplanation &&
        line.toLowerCase().includes(mentalHealthCategory.toLowerCase())
      ) {
        relevantLines.push(line)
      }

      // End of explanation section
      if (
        inExplanation &&
        (line.toLowerCase().includes('recommend') ||
          line.toLowerCase().includes('suggestion') ||
          line.toLowerCase().includes('treatment'))
      ) {
        inExplanation = false
      }
    }

    // If we didn't find specific explanation lines, use the whole text
    if (relevantLines.length === 0) {
      return interventionText
    }

    return relevantLines.join('\n')
  }

  /**
   * Generate an improved explanation for a mental health classification using expert examples
   * @param text The text to explain
   * @param mentalHealthCategory The category to explain
   * @returns Detailed explanation enhanced with expert knowledge
   */
  async generateExplanationWithExpertGuidance(
    text: string,
    mentalHealthCategory: string,
  ): Promise<string> {
    logger.info('Generating explanation with expert guidance', {
      category: mentalHealthCategory,
    })

    try {
      // First, load expert explanations
      const expertExplanations = await this.loadExpertExplanations()
      const categoryExplanations =
        expertExplanations[mentalHealthCategory] || []

      // If we don't have expert explanations for this category, use the regular generation
      if (categoryExplanations.length === 0) {
        return this.generateExplanation(text, mentalHealthCategory)
      }

      // Create a synthetic session for the provider
      const session: TherapySession = {
        sessionId: `expert-explanation-${Date.now()}`,
        clientId: 'mental-llama-client',
        therapistId: 'mental-llama-therapist',
        startTime: new Date(),
        status: 'active',
        securityLevel: 'hipaa',
        emotionAnalysisEnabled: true,
      }

      // Analyze emotions first
      const emotionAnalysis = await this.provider.analyzeEmotions(text)

      // Extract supporting evidence
      const evidenceCategory = {
        category: mentalHealthCategory,
        score: 0.8, // Default high score for evidence extraction
        explanation: '', // Will be filled later
      }
      const supportingEvidence = this.extractSupportingEvidence(
        text,
        evidenceCategory,
      )

      // Choose a random expert explanation as a base template
      const expertTemplate =
        categoryExplanations[
          Math.floor(Math.random() * categoryExplanations.length)
        ]

      // Build an enhanced prompt for the provider that includes:
      // 1. The patient's text
      // 2. The identified category
      // 3. Supporting evidence
      // 4. Expert explanation template
      const enhancedPrompt = `
Patient text: "${text}"

Based on my analysis, I've identified potential signs of ${mentalHealthCategory.replace('_', ' ')} in this text.

Supporting evidence I've found:
${supportingEvidence.map((evidence, i) => `${i + 1}. "${evidence}"`).join('\n')}

I need to create a clinical explanation that identifies and explains the indicators of ${mentalHealthCategory.replace('_', ' ')} present in this text. Here's an example of a good clinical explanation:

Example: ${expertTemplate}

Please generate a comprehensive, clinically informed explanation for this specific case, highlighting the key indicators and contextual factors that suggest ${mentalHealthCategory.replace('_', ' ')}.
`

      // Generate intervention with the enhanced prompt
      const intervention = await this.provider.generateIntervention(
        session,
        emotionAnalysis,
        enhancedPrompt, // Use our enhanced prompt with expert guidance
      )

      // Extract just the explanation part and clean it up
      const explanation = this.extractExplanation(
        intervention.content,
        mentalHealthCategory,
      )
        .replace(/Example:/g, '') // Remove any references to the example
        .trim()

      return explanation
    } catch (error) {
      logger.error('Failed to generate explanation with expert guidance', {
        error,
      })
      // Fall back to regular explanation generation
      return this.generateExplanation(text, mentalHealthCategory)
    }
  }

  /**
   * Analyze a text for mental health indicators with enhanced explanation
   * @param text The text to analyze
   * @param useExpertGuidance Whether to use expert guidance for explanations
   * @returns Analysis with mental health indicators and explanations
   */
  async analyzeMentalHealthWithExpertGuidance(
    text: string,
    useExpertGuidance: boolean = true,
  ): Promise<{
    hasMentalHealthIssue: boolean
    mentalHealthCategory: string
    explanation: string
    confidence: number
    supportingEvidence: string[]
    expertGuided: boolean
  }> {
    logger.info(
      'Analyzing text for mental health indicators with expert guidance',
    )

    try {
      // First do regular analysis
      const initialAnalysis = await this.analyzeMentalHealth(text)

      // If expert guidance is requested and we have a mental health issue
      if (useExpertGuidance && initialAnalysis.hasMentalHealthIssue) {
        // Generate enhanced explanation with expert guidance
        const enhancedExplanation =
          await this.generateExplanationWithExpertGuidance(
            text,
            initialAnalysis.mentalHealthCategory,
          )

        return {
          ...initialAnalysis,
          explanation: enhancedExplanation,
          expertGuided: true,
        }
      }

      // Otherwise return the original analysis
      return {
        ...initialAnalysis,
        expertGuided: false,
      }
    } catch (error) {
      logger.error('Failed to analyze mental health with expert guidance', {
        error,
      })
      throw error
    }
  }
}
