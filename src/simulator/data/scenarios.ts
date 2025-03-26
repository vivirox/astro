import type { Scenario } from '../types'
import {
  ScenarioDifficulty,
  TherapeuticDomain,
  TherapeuticTechnique,
} from '../types'

/**
 * Sample therapeutic practice scenarios
 * Each scenario provides context for practicing different therapeutic techniques
 */
const scenarios: Scenario[] = [
  {
    id: 'depression-mild-initial',
    title: 'Initial Session: Mild Depression',
    description:
      'Practice engaging with a client who is experiencing mild depressive symptoms following a job loss.',
    domain: TherapeuticDomain.DEPRESSION,
    difficulty: ScenarioDifficulty.BEGINNER,
    techniques: [
      TherapeuticTechnique.ACTIVE_LISTENING,
      TherapeuticTechnique.REFLECTIVE_STATEMENTS,
      TherapeuticTechnique.OPEN_ENDED_QUESTIONS,
    ],
    contextDescription:
      'First session with a client who has been experiencing low mood for several weeks.',
    clientBackground:
      'Alex is a 35-year-old software developer who lost their job 2 months ago. They have been experiencing difficulty finding motivation to apply for new positions and report feeling "worthless" and "like a failure." They have no prior history of mental health treatment.',
    presentingIssue:
      'Persistent feelings of low mood, sleep disturbances, reduced appetite, and difficulty concentrating on job applications.',
    objectives: [
      'Build rapport and establish therapeutic alliance',
      'Gather information about depressive symptoms',
      'Explore the connection between job loss and current mood state',
      'Identify potential supports and coping strategies',
    ],
    suggestedApproaches: [
      'Use reflective listening to validate feelings about job loss',
      'Explore strengths and past successes to counter negative self-perception',
      'Ask open-ended questions about the impact of symptoms on daily functioning',
    ],
  },
  {
    id: 'anxiety-panic-mid',
    title: 'Panic Disorder: Intervention Session',
    description:
      'Practice helping a client who is experiencing panic attacks and developing avoidance behaviors.',
    domain: TherapeuticDomain.ANXIETY,
    difficulty: ScenarioDifficulty.INTERMEDIATE,
    techniques: [
      TherapeuticTechnique.COGNITIVE_RESTRUCTURING,
      TherapeuticTechnique.MINDFULNESS,
      TherapeuticTechnique.VALIDATION,
    ],
    contextDescription:
      'Fourth session with a client who has been experiencing increasing frequency of panic attacks.',
    clientBackground:
      'Jordan is a 28-year-old teacher who began experiencing panic attacks 6 months ago. The first attack occurred while driving on the highway, and they now avoid highway driving completely. Recently, the attacks have begun occurring in crowded places like grocery stores.',
    presentingIssue:
      'Increasing frequency of panic attacks with physical symptoms (racing heart, dizziness, shortness of breath) and expanding avoidance behaviors that are limiting daily functioning.',
    objectives: [
      'Address catastrophic thinking patterns related to panic sensations',
      'Introduce grounding techniques for managing acute anxiety',
      'Begin exploring gradual exposure to avoided situations',
      'Normalize physiological aspects of panic response',
    ],
    suggestedApproaches: [
      'Help identify and challenge catastrophic thoughts about physical sensations',
      'Practice mindfulness or grounding exercises during the session',
      'Discuss the anxiety cycle and how avoidance reinforces fear',
    ],
  },
  {
    id: 'trauma-ptsd-advanced',
    title: 'PTSD: Processing Traumatic Memory',
    description:
      'Practice facilitating trauma processing with a client ready to address a specific traumatic memory.',
    domain: TherapeuticDomain.TRAUMA,
    difficulty: ScenarioDifficulty.ADVANCED,
    techniques: [
      TherapeuticTechnique.GROUNDING_TECHNIQUES,
      TherapeuticTechnique.VALIDATION,
      TherapeuticTechnique.MINDFULNESS,
    ],
    contextDescription:
      'Session focused on processing a specific traumatic memory with a client who has established good coping skills and has a strong therapeutic alliance with you.',
    clientBackground:
      'Taylor is a 42-year-old veteran who experienced a combat-related trauma 8 years ago. They have been in therapy with you for 4 months, have learned several grounding and emotion regulation techniques, and have decided they are ready to process one of their traumatic memories.',
    presentingIssue:
      'Recurring nightmares and intrusive memories of a specific combat incident, hypervigilance in public places, and emotional numbing that is affecting relationships.',
    objectives: [
      'Support client through regulated trauma processing',
      'Monitor for signs of overwhelm or dissociation during the session',
      'Help integrate new perspectives on the traumatic experience',
      'Reinforce grounding skills before, during, and after processing',
    ],
    suggestedApproaches: [
      'Check in frequently about emotion regulation and distress levels',
      'Use grounding techniques when the client shows signs of heightened activation',
      'Validate emotions without reinforcing avoidance',
      'Maintain a balanced pace that allows processing without overwhelming',
    ],
  },
  {
    id: 'substance-use-ambivalence',
    title: 'Substance Use: Exploring Ambivalence',
    description:
      'Practice motivational interviewing techniques with a client who is ambivalent about changing their alcohol use.',
    domain: TherapeuticDomain.SUBSTANCE_USE,
    difficulty: ScenarioDifficulty.INTERMEDIATE,
    techniques: [
      TherapeuticTechnique.MOTIVATIONAL_INTERVIEWING,
      TherapeuticTechnique.OPEN_ENDED_QUESTIONS,
      TherapeuticTechnique.REFLECTIVE_STATEMENTS,
    ],
    contextDescription:
      'Second session with a client who was referred by their primary care provider due to concerns about alcohol use but is unsure if they want to change.',
    clientBackground:
      'Casey is a 39-year-old marketing executive who drinks 4-6 alcoholic beverages most nights. Their doctor expressed concern about elevated liver enzymes during a recent physical. They acknowledge drinking "more than average" but see it as a way to manage work stress and socialize with colleagues.',
    presentingIssue:
      'Referred for alcohol use, experiencing insomnia, morning fatigue, occasional blackouts, and increasing arguments with partner about drinking habits.',
    objectives: [
      'Explore ambivalence about current drinking patterns',
      'Elicit change talk without creating resistance',
      'Examine discrepancies between current behavior and personal values',
      'Identify potential motivation for change',
    ],
    suggestedApproaches: [
      'Use reflective listening to explore both sides of their ambivalence',
      'Ask open-ended questions about the impact of drinking on their life',
      'Avoid confrontation or arguments about the need to change',
      'Explore vision of future self with and without changes to drinking patterns',
    ],
  },
  {
    id: 'grief-complicated',
    title: 'Complicated Grief: Supporting Integration',
    description:
      'Practice supporting a client experiencing complicated grief following the unexpected loss of a spouse.',
    domain: TherapeuticDomain.GRIEF,
    difficulty: ScenarioDifficulty.ADVANCED,
    techniques: [
      TherapeuticTechnique.VALIDATION,
      TherapeuticTechnique.ACTIVE_LISTENING,
      TherapeuticTechnique.BEHAVIORAL_ACTIVATION,
    ],
    contextDescription:
      'Ongoing therapy with a client who lost their spouse in a car accident 18 months ago and is struggling with complicated grief reactions.',
    clientBackground:
      'Morgan is a 58-year-old who lost their spouse in a sudden car accident. They have two adult children who live out of state. Prior to the loss, Morgan was socially active and enjoyed their work as a librarian, but has since become isolated and recently took a leave of absence from work.',
    presentingIssue:
      'Persistent acute grief, inability to discuss the loss without overwhelming emotions, avoidance of reminders of the spouse, and withdrawal from previously meaningful activities and relationships.',
    objectives: [
      'Validate the complexity of grief emotions without pathologizing',
      'Support connecting with the emotional pain of loss in tolerable ways',
      'Explore continued bonds with deceased that support moving forward',
      'Gradually reintroduce meaningful activities and relationships',
    ],
    suggestedApproaches: [
      'Create space for grief emotions while building windows of tolerance',
      'Explore how avoiding grief is impacting current functioning',
      'Identify small steps toward re-engagement with meaningful life activities',
      "Discuss what honoring their spouse's memory means in the context of creating a new life",
    ],
  },
  {
    id: 'relationship-communication',
    title: 'Relationship: Communication Patterns',
    description:
      'Practice working with a couple to identify and modify problematic communication patterns.',
    domain: TherapeuticDomain.RELATIONSHIP,
    difficulty: ScenarioDifficulty.INTERMEDIATE,
    techniques: [
      TherapeuticTechnique.ACTIVE_LISTENING,
      TherapeuticTechnique.VALIDATION,
      TherapeuticTechnique.OPEN_ENDED_QUESTIONS,
    ],
    contextDescription:
      'Third session with a couple who have been together for 6 years and are experiencing increasing conflict.',
    clientBackground:
      'Jamie and Riley have been together for 6 years and married for 3. They describe their relationship as "loving but lately full of arguments." Both work demanding jobs, and they have been discussing whether to have children, which has become a source of tension.',
    presentingIssue:
      'Escalating arguments that leave both feeling unheard, increasing emotional distance, and difficulty making decisions together about their future.',
    objectives: [
      'Identify recurring communication patterns that lead to conflict',
      'Help each partner recognize their role in problematic interactions',
      'Facilitate more effective expression of underlying needs and feelings',
      'Practice alternative communication approaches during the session',
    ],
    suggestedApproaches: [
      'Observe and reflect the cycle of interaction they demonstrate',
      "Validate each partner's emotional experience without taking sides",
      'Slow down communication to identify triggers and reactions',
      'Guide practice of speaking and listening skills during the session',
    ],
  },
  {
    id: 'stress-burnout',
    title: 'Workplace Stress and Burnout',
    description:
      'Practice helping a client recognize and address signs of burnout and develop better work-life boundaries.',
    domain: TherapeuticDomain.STRESS_MANAGEMENT,
    difficulty: ScenarioDifficulty.BEGINNER,
    techniques: [
      TherapeuticTechnique.COGNITIVE_RESTRUCTURING,
      TherapeuticTechnique.GOAL_SETTING,
      TherapeuticTechnique.BEHAVIORAL_ACTIVATION,
    ],
    contextDescription:
      'Second session with a client who initially presented with sleep problems and has realized these are connected to workplace stress.',
    clientBackground:
      'Robin is a 31-year-old healthcare worker who has been in their current role for 4 years. They previously enjoyed their work but have been experiencing increasing stress due to staffing shortages and higher workload. They pride themselves on being reliable and rarely say no to additional responsibilities.',
    presentingIssue:
      'Difficulty sleeping, irritability, dreading going to work, bringing work home regularly, and canceling social plans due to exhaustion.',
    objectives: [
      'Identify beliefs and behaviors that contribute to burnout',
      'Develop strategies for setting healthier work boundaries',
      'Reconnect with values and sources of meaning beyond work',
      'Create realistic plan for incorporating self-care into daily life',
    ],
    suggestedApproaches: [
      'Explore perfectionistic or people-pleasing thought patterns',
      'Discuss the concept of sustainable productivity versus burnout',
      'Help identify small, concrete steps for reclaiming personal time',
      'Practice assertive communication for setting boundaries',
    ],
  },
  {
    id: 'crisis-suicidal-ideation',
    title: 'Crisis Intervention: Suicidal Ideation',
    description:
      'Practice conducting a suicide risk assessment and developing a safety plan with a client in crisis.',
    domain: TherapeuticDomain.CRISIS_INTERVENTION,
    difficulty: ScenarioDifficulty.EXPERT,
    techniques: [
      TherapeuticTechnique.ACTIVE_LISTENING,
      TherapeuticTechnique.VALIDATION,
      TherapeuticTechnique.GOAL_SETTING,
    ],
    contextDescription:
      'Urgent session with a client who called your crisis line reporting suicidal thoughts following a relationship breakup.',
    clientBackground:
      'Quinn is a 26-year-old who recently experienced a painful breakup after a 3-year relationship. They have a history of depression and one previous suicide attempt at age 19. They live alone and report that their ex-partner was "the only person who really cared" about them.',
    presentingIssue:
      'Acute suicidal ideation with thoughts of overdosing, feeling that "there\'s no point in going on," insomnia for the past week, and social isolation.',
    objectives: [
      'Assess current suicide risk level and immediate safety needs',
      'Validate emotional pain while instilling hope for alternative solutions',
      'Identify protective factors and reasons for living',
      'Develop concrete safety plan with specific steps and resources',
    ],
    suggestedApproaches: [
      'Ask directly about suicidal thoughts, plans, and access to means',
      'Balance validation of pain with focus on temporary nature of crisis',
      'Explore ambivalence about dying versus escaping current pain',
      'Create specific, actionable steps for maintaining safety',
    ],
  },
]

/**
 * Get all available scenarios for selection
 */
export function getAllScenarios(): Scenario[] {
  return scenarios
}

/**
 * Get a specific scenario by ID
 */
export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}

/**
 * Get scenarios filtered by domain
 */
export function getScenariosByDomain(domain: TherapeuticDomain): Scenario[] {
  return scenarios.filter((scenario) => scenario.domain === domain)
}

/**
 * Get scenarios filtered by difficulty level
 */
export function getScenariosByDifficulty(
  difficulty: ScenarioDifficulty,
): Scenario[] {
  return scenarios.filter((scenario) => scenario.difficulty === difficulty)
}
