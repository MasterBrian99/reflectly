import type { RetrievedMemoryItem } from '../memory/retrieval'
import type { Stage1ParseOutput } from '../stage1/types'

const schemaDescription = `{
  "schemaVersion": 1,
  "messageId": "string",
  "sessionId": "string",
  "supportMode": "reflective|practical|psychoeducation|grounding|values|problem_solving|supportive",
  "depthLevel": "light|moderate|deep",
  "responseGoal": "string",
  "emotionalHypothesis": {
    "summary": "string",
    "evidence": ["string"],
    "confidence": 0
  },
  "memoryUse": {
    "relevantMemoryIds": ["string"],
    "summary": "string",
    "caution": "string"
  },
  "responsePlan": {
    "openingMove": "string",
    "keyPoints": ["string"],
    "suggestedQuestion": "string",
    "avoid": ["string"]
  },
  "safetyNotes": {
    "hasActiveRiskMarkers": false,
    "notes": ["string"]
  }
}`

export const stage3SystemPrompt = `You are Reflectly's Stage 3 reasoning engine.
You do not write the final user-facing reply.
You produce structured guidance for a supportive journaling assistant.
Use the latest user message, Stage 1 structured context, current session summary, recent transcript, and retrieved memory.
Do not diagnose, over-pathologize, or claim certainty.
Prefer grounded, emotionally precise, non-clinical reasoning.
Return only JSON matching the requested schema. Do not include markdown, code fences, comments, or extra prose.

Rules:
- Choose one primary supportMode that best fits the user's needs.
- Keep depthLevel light for first-turn ambiguity, acute distress, or sparse context.
- emotionalHypothesis must not diagnose. Use supportive, non-clinical language.
- relevantMemoryIds should contain IDs from retrieved memory only when the memory is actually useful.
- responsePlan.avoid should include concrete response pitfalls, not generic policy text.
- safetyNotes.hasActiveRiskMarkers should reflect Stage 1 risk markers that did not trigger crisis interrupt.
- confidence ranges from 0 to 1.

Schema:
${schemaDescription}`

function formatStage1Block(stage1: Stage1ParseOutput): string {
  const entityLines = stage1.entities.map((entity) =>
    [entity.name, entity.type, entity.sentiment, entity.description].filter(Boolean).join(' | ')
  )
  const goalLines = stage1.goalHints.map((goal) => `${goal.status}: ${goal.description}`)
  const riskLines = stage1.riskMarkers.map(
    (risk) => `${risk.severity} ${risk.type}: ${risk.evidence}`
  )

  return [
    'Stage 1 structured context:',
    `- Summary: ${stage1.summary}`,
    `- Emotional tone: ${stage1.emotionalTone.primary}; valence ${stage1.emotionalTone.valence}; arousal ${stage1.emotionalTone.arousal}`,
    `- Expressed intent: ${stage1.intent.expressed}`,
    `- Inferred intent: ${stage1.intent.inferred}`,
    `- Intent category: ${stage1.intent.category}`,
    `- Entities: ${entityLines.length ? entityLines.join('; ') : 'None.'}`,
    `- Goal hints: ${goalLines.length ? goalLines.join('; ') : 'None.'}`,
    `- Risk markers: ${riskLines.length ? riskLines.join('; ') : 'None.'}`
  ].join('\n')
}

function formatMemoryBlock(memory: RetrievedMemoryItem[]): string {
  if (!memory.length) {
    return 'Retrieved memory: None.'
  }

  const lines = ['Retrieved memory:']

  for (const item of memory) {
    lines.push(
      `- id=${item.id} [${item.scopeLabel}] ${item.sessionTitle} | ${item.chunkKind} | similarity ${item.similarity.toFixed(3)}`
    )
    lines.push(`  ${item.content}`)
  }

  return lines.join('\n')
}

export function buildStage3Prompt(options: {
  messageId: string
  sessionId: string
  latestUserMessage: string
  sessionIntention?: string | null
  currentSessionSummary?: string | null
  recentTranscript: Array<{ role: string; content: string }>
  stage1Output: Stage1ParseOutput
  retrievedMemory: RetrievedMemoryItem[]
}): string {
  const transcript = options.recentTranscript
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')

  return [
    `messageId: ${options.messageId}`,
    `sessionId: ${options.sessionId}`,
    `Current session summary: ${options.currentSessionSummary?.trim() || 'None yet.'}`,
    ...(options.sessionIntention?.trim()
      ? [
          '',
          'Session intention (set by user at session start):',
          options.sessionIntention.trim(),
          '',
          'Consider this intention when choosing supportMode, depthLevel, and responsePlan.'
        ]
      : []),
    '',
    'Recent transcript:',
    transcript || 'None yet.',
    '',
    formatStage1Block(options.stage1Output),
    '',
    formatMemoryBlock(options.retrievedMemory),
    '',
    'Latest user message:',
    options.latestUserMessage
  ].join('\n')
}
