import {
  SimulationDifficulty,
  SimulationScenario,
  TherapeuticDomain,
} from '../types'

/**
 * Example predefined scenarios for the simulation
 * In a real implementation, these would come from an API
 */
const exampleScenarios: SimulationScenario[] = [
  {
    id: 'anxiety-001',
    title: 'Anxiety Management Session',
    description:
      'Practice helping a patient with anxiety disorder develop coping strategies.',
    domain: 'cognitive_behavioral',
    difficulty: 'intermediate',
    targetSkills: [
      'empathetic_response',
      'technique_application',
      'active_listening',
    ],
    scenarioContext:
      'The patient has been experiencing increasing anxiety over the past 6 months, affecting work and relationships.',
    patientBackground:
      'Alex, 32, software engineer with history of generalized anxiety disorder. Recently promoted at work with increased responsibilities.',
    presentingIssues: [
      'Panic attacks',
      'Sleep disturbance',
      'Worry about job performance',
      'Social withdrawal',
    ],
  },
  {
    id: 'depression-001',
    title: 'Depression Initial Assessment',
    description:
      'Conduct an initial assessment for a patient experiencing symptoms of depression.',
    domain: 'psychodynamic',
    difficulty: 'beginner',
    targetSkills: [
      'empathetic_response',
      'question_formulation',
      'active_listening',
    ],
    scenarioContext:
      'First session with a patient who was referred by their primary care physician due to symptoms of depression.',
    patientBackground:
      'Jamie, 45, recently divorced, working in finance, reporting low mood and loss of interest for several months.',
    presentingIssues: [
      'Persistent low mood',
      'Loss of interest',
      'Sleep disruption',
      'Decreased appetite',
      'Difficulty concentrating at work',
    ],
  },
  {
    id: 'trauma-001',
    title: 'Trauma-Informed Care Session',
    description:
      'Practice a trauma-informed approach with a patient who has experienced a recent traumatic event.',
    domain: 'trauma_informed',
    difficulty: 'advanced',
    targetSkills: [
      'therapeutic_alliance',
      'empathetic_response',
      'intervention_timing',
    ],
    scenarioContext:
      'Third session with a patient who recently experienced a car accident resulting in physical injuries and psychological distress.',
    patientBackground:
      'Taylor, 29, teacher, involved in a serious car accident 2 months ago, developing symptoms of acute stress disorder.',
    presentingIssues: [
      'Flashbacks',
      'Hypervigilance',
      'Sleep disturbance',
      'Avoidance behaviors',
      'Physical tension',
    ],
  },
  {
    id: 'family-001',
    title: 'Family Conflict Resolution',
    description:
      'Help family members improve communication and resolve ongoing conflicts.',
    domain: 'family_systems',
    difficulty: 'advanced',
    targetSkills: [
      'question_formulation',
      'framework_adherence',
      'communication_style',
    ],
    scenarioContext:
      'Second session with a family experiencing communication breakdowns and frequent conflicts.',
    patientBackground:
      'The Johnson family: parents (mid-40s) and two teenagers (15, 17), reporting increased conflict and communication difficulties after the eldest child started college preparation.',
    presentingIssues: [
      'Communication breakdowns',
      'Frequent arguments',
      'Power struggles between parents and teenagers',
      'Parental disagreements about discipline',
    ],
  },
  {
    id: 'addiction-001',
    title: 'Substance Use Motivational Interview',
    description:
      'Practice motivational interviewing techniques with a patient experiencing substance use issues.',
    domain: 'motivational_interviewing',
    difficulty: 'intermediate',
    targetSkills: [
      'technique_application',
      'therapeutic_alliance',
      'framework_adherence',
    ],
    scenarioContext:
      'Second session with a patient who has been referred for alcohol use concerns but is ambivalent about making changes.',
    patientBackground:
      'Morgan, 38, marketing executive, drinking has increased over the past year to "manage stress," spouse concerned about impact on relationship.',
    presentingIssues: [
      'Increased alcohol consumption',
      'Work stress',
      'Relationship difficulties',
      'Sleep issues',
      'Ambivalence about change',
    ],
  },
]

/**
 * Get all available scenarios
 */
export const getScenarios = async (): Promise<SimulationScenario[]> => {
  // In a real implementation, this would fetch scenarios from an API
  // For now, we'll return the example scenarios with a simulated delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  return exampleScenarios
}

/**
 * Get a specific scenario by ID
 */
export const getScenarioById = async (
  id: string,
): Promise<SimulationScenario | null> => {
  // In a real implementation, this would fetch a specific scenario from an API
  // For now, we'll find it in our example scenarios
  await new Promise((resolve) => setTimeout(resolve, 300))
  return exampleScenarios.find((scenario) => scenario.id === id) || null
}

/**
 * Filter scenarios by domain and difficulty
 */
export const filterScenarios = async (
  domain?: TherapeuticDomain,
  difficulty?: SimulationDifficulty,
): Promise<SimulationScenario[]> => {
  // In a real implementation, this would use API filters
  // For now, we'll filter the examples
  await new Promise((resolve) => setTimeout(resolve, 400))

  return exampleScenarios.filter((scenario) => {
    if (domain && scenario.domain !== domain) return false
    if (difficulty && scenario.difficulty !== difficulty) return false
    return true
  })
}

/**
 * Get recommended next scenario based on user performance
 */
export const getRecommendedScenario = async (
  completedScenarioIds: string[],
  performanceLevel: 'beginner' | 'intermediate' | 'advanced',
): Promise<SimulationScenario | null> => {
  // In a real implementation, this would use a recommendation algorithm
  // For now, we'll just pick a scenario the user hasn't completed yet

  await new Promise((resolve) => setTimeout(resolve, 600))

  // Find scenarios not yet completed
  const availableScenarios = exampleScenarios.filter(
    (scenario) => !completedScenarioIds.includes(scenario.id),
  )

  if (availableScenarios.length === 0) return null

  // Find scenarios at the appropriate difficulty level
  const matchingDifficulty = availableScenarios.filter(
    (scenario) => scenario.difficulty === performanceLevel,
  )

  // Return a matching difficulty scenario if available, otherwise any available scenario
  return matchingDifficulty.length > 0
    ? matchingDifficulty[Math.floor(Math.random() * matchingDifficulty.length)]
    : availableScenarios[Math.floor(Math.random() * availableScenarios.length)]
}
