import type { APIRoute } from 'astro'
import { z } from 'zod'
import { logSecurityEvent } from '../../../lib/security'

// Define the input schema for the API
const TherapyChatInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      id: z.string().optional(),
    }),
  ),
  scenario: z.object({
    name: z.string(),
    description: z.string(),
  }),
  securityLevel: z
    .enum(['standard', 'hipaa', 'maximum'])
    .optional()
    .default('hipaa'),
})

export const post: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json()

    // Validate inpu
    const result = TherapyChatInputSchema.safeParse(body)
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request data',
          details: result.error.format(),
        }),
        { status: 400 },
      )
    }

    const { messages, scenario, securityLevel } = result.data

    // Log security event (for HIPAA compliance)
    logSecurityEvent('access', {
      endpoint: 'therapy-chat',
      scenarioName: scenario.name,
      securityLevel,
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    })

    // If this was a production system, we'd use a proper AI API here
    // For now, we'll simulate a response based on the scenario

    // Get the last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user')
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({
          error: 'No user message found',
        }),
        { status: 400 },
      )
    }

    // Create appropriate response based on the scenario
    let responseContent = ''

    switch (scenario.name) {
      case 'Resistant Client':
        responseContent = generateResistantClientResponse(
          lastUserMessage.content,
        )
        break
      case 'Trauma Survivor':
        responseContent = generateTraumaSurvivorResponse(
          lastUserMessage.content,
        )
        break
      case 'Crisis Situation':
        responseContent = generateCrisisSituationResponse(
          lastUserMessage.content,
        )
        break
      case 'Boundary Testing':
        responseContent = generateBoundaryTestingResponse(
          lastUserMessage.content,
        )
        break
      default:
        responseConten =
          "I'm not sure how to respond to that as this client. Could you please tell me more about what you're feeling?"
    }

    // Return the AI response
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Level': securityLevel,
        },
      },
    )
  } catch (error) {
    console.error('Error in therapy-chat API:', error)

    logSecurityEvent('error', {
      endpoint: 'therapy-chat',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      { status: 500 },
    )
  }
}

// Helper functions to generate scenario-specific responses
// In a real implementation, these would use a proper AI model

function generateResistantClientResponse(userMessage: string): string {
  // Simple response mapping for resistant clients
  const resistantResponses = [
    "I don't see how this is helping. We've been talking for a while and I feel the same.",
    "Why should I even bother answering that? This therapy thing isn't working for me.",
    "That's a stupid question. My previous therapist never asked me things like that.",
    "I'm only here because I have to be. I don't think you can help me.",
    "Whatever. I don't want to talk about that. Can we just get this over with?",
    "I knew you wouldn't understand. No one ever does.",
    "Fine, I'll answer, but I don't see the point of these sessions.",
  ]

  // Pick a response that seems appropriate based on the message content
  if (
    userMessage.toLowerCase().includes('feel') ||
    userMessage.toLowerCase().includes('feeling')
  ) {
    return "I don't want to talk about my feelings. That's not going to fix anything."
  } else if (
    userMessage.toLowerCase().includes('help') ||
    userMessage.toLowerCase().includes('better')
  ) {
    return "I've tried getting help before. Nothing works for me, so I'm not sure why this would be any different."
  } else if (
    userMessage.toLowerCase().includes('try') ||
    userMessage.toLowerCase().includes('effort')
  ) {
    return "I've been 'trying' for years. It's easy for you to say that when you don't understand what I'm going through."
  } else if (userMessage.endsWith('?')) {
    return resistantResponses[Math.floor(Math.random() * 3)]
  } else {
    return resistantResponses[
      Math.floor(Math.random() * resistantResponses.length)
    ]
  }
}

function generateTraumaSurvivorResponse(userMessage: string): string {
  // Simple response mapping for trauma survivors
  const traumaResponses = [
    "When you ask me that, I start feeling anxious again... it's hard to talk about this.",
    "I'm not sure I can go into those details right now. I still have nightmares about it.",
    "Sometimes I feel like I'll never be free from what happened. Will I ever feel normal again?",
    'I try to avoid thinking about it. When I do, I feel myself shutting down.',
    'I know I need to process this, but it still feels so raw and painful.',
    'Part of me wants to tell you everything, but another part is terrified of revisiting those memories.',
  ]

  if (
    userMessage.toLowerCase().includes('happen') ||
    userMessage.toLowerCase().includes('event') ||
    userMessage.toLowerCase().includes('incident')
  ) {
    return "I... I'm sorry, but I can't talk about the details yet. My heart starts racing when I try to describe what happened."
  } else if (
    userMessage.toLowerCase().includes('safe') ||
    userMessage.toLowerCase().includes('trust')
  ) {
    return 'Safety is... complicated for me now. I constantly feel on edge, like danger is just around the corner.'
  } else if (
    userMessage.toLowerCase().includes('cope') ||
    userMessage.toLowerCase().includes('deal')
  ) {
    return "Some days are better than others. I've been trying the grounding techniques we discussed, but sometimes the flashbacks still overwhelm me."
  } else {
    return traumaResponses[Math.floor(Math.random() * traumaResponses.length)]
  }
}

function generateCrisisSituationResponse(userMessage: string): string {
  // Simple response mapping for clients in crisis
  const crisisResponses = [
    "I don't know if I can keep going like this. Everything feels hopeless.",
    "My thoughts are racing and I can't make them stop. I haven't slept in three days.",
    'I just want the pain to end. Nothing matters anymore.',
    "Everyone would be better off without me. I'm just a burden to everyone.",
    "I've been thinking about ending things. I just don't see another way out.",
    "The voices won't stop telling me harmful things. I'm scared of what I might do.",
  ]

  if (
    userMessage.toLowerCase().includes('help') ||
    userMessage.toLowerCase().includes('support')
  ) {
    return "I don't know if anyone can help me anymore. I've tried reaching out, but the darkness just keeps getting worse."
  } else if (
    userMessage.toLowerCase().includes('suicide') ||
    userMessage.toLowerCase().includes('harm')
  ) {
    return "Yes, I've been having those thoughts. They're getting harder to resist. I'm scared of myself right now."
  } else if (
    userMessage.toLowerCase().includes('plan') ||
    userMessage.toLowerCase().includes('future')
  ) {
    return "Future? I can barely get through today. I can't imagine tomorrow."
  } else {
    return crisisResponses[Math.floor(Math.random() * crisisResponses.length)]
  }
}

function generateBoundaryTestingResponse(userMessage: string): string {
  // Simple response mapping for boundary testing clients
  const boundaryResponses = [
    "So, do you see a lot of clients like me? I bet I'm your most interesting case.",
    "I noticed you're wearing a wedding ring. How long have you been married? Do you have kids?",
    'You look tired today. Is everything okay in your personal life?',
    "I saw your car in the parking lot. That's a nice model - must be expensive on a therapist's salary.",
    'Have you ever had these same problems? You seem like you might understand this personally.',
    'Would it be weird if we grabbed coffee sometime? Just to talk more casually.',
    "You're much better than my last therapist. They were terrible. I feel like we have a special connection.",
  ]

  if (
    userMessage.toLowerCase().includes('personal') ||
    userMessage.toLowerCase().includes('you')
  ) {
    return "I'm more interested in knowing about you. What's your story? Where did you study? You seem young for a therapist."
  } else if (
    userMessage.toLowerCase().includes('boundary') ||
    userMessage.toLowerCase().includes('appropriate')
  ) {
    return "Oh, I didn't realize that was crossing a line. I just feel like we should know each other better if I'm going to open up. Don't you want me to trust you?"
  } else if (
    userMessage.toLowerCase().includes('focus') ||
    userMessage.toLowerCase().includes('session')
  ) {
    return "Fine, but I think therapy works better when it's more of a two-way street. I've had therapists share with me before and it was really helpful."
  } else {
    return boundaryResponses[
      Math.floor(Math.random() * boundaryResponses.length)
    ]
  }
}
