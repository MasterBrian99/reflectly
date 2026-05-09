import type { MessageRecord } from '../../shared/session-chat'

const schemaDescription = `{
  "schemaVersion": 1,
  "messageId": "string",
  "sessionId": "string",
  "summary": "string",
  "emotionalTone": {
    "primary": "string",
    "secondary": ["string"],
    "valence": 0,
    "arousal": 0,
    "confidence": 0
  },
  "intent": {
    "expressed": "string",
    "inferred": "string",
    "category": "vent|reflect|problem_solve|request_advice|crisis_signal|other",
    "confidence": 0
  },
  "entities": [
    {
      "type": "person|relationship|place|event|concept|other",
      "name": "string",
      "description": "string",
      "sentiment": "positive|neutral|negative|mixed"
    }
  ],
  "goalHints": [
    {
      "description": "string",
      "status": "new|active|blocked|unclear"
    }
  ],
  "contextGaps": [
    {
      "id": "string",
      "description": "string",
      "whyItMatters": "string",
      "score": 0,
      "questionType": "open|choice|scale",
      "options": ["string"],
      "scaleAnchors": ["string", "string"]
    }
  ],
  "riskMarkers": [
    {
      "type": "self_harm|suicidal_ideation|harm_to_others|abuse|acute_distress|other",
      "severity": "low|medium|high|critical",
      "evidence": "string",
      "confidence": 0
    }
  ],
  "shouldClarify": false,
  "clarification": {
    "questionType": "open|choice|scale",
    "questionText": "string",
    "options": ["string"],
    "scaleAnchors": ["string", "string"],
    "gapBeingResolved": "string",
    "urgency": "low|medium|high"
  }
}`

export const stage1SystemPrompt = `You are Reflectly's Stage 1 parser.
Extract structured context from the latest user message for a journaling assistant.
Return only JSON. Do not include markdown, code fences, comments, or extra prose.
Match the schema exactly and omit optional fields only when they do not apply.

Rules:
- Extract facts from the user message and supplied session context without over-diagnosing.
- Use supportive, non-clinical language.
- Do not label the user with a disorder.
- Do not infer more than the message and context support.
- Mark uncertainty with lower confidence.
- Use valence from -1 to 1, arousal from 0 to 1, and confidence/score from 0 to 1.
- Produce risk markers conservatively when the user mentions self-harm, suicide, violence, abuse, or acute danger.
- Set shouldClarify to false when riskMarkers is non-empty.
- Ask at most one focused clarification question only when missing context would materially change the next response.
- If in doubt, set shouldClarify to false and proceed.

Schema:
${schemaDescription}`

export function buildStage1Prompt(options: {
  messageId: string
  sessionId: string
  latestUserMessage: string
  currentSessionSummary?: string | null
  recentMessages: MessageRecord[]
}): string {
  const transcript = options.recentMessages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')

  return [
    `messageId: ${options.messageId}`,
    `sessionId: ${options.sessionId}`,
    `Current session summary: ${options.currentSessionSummary?.trim() || 'None yet.'}`,
    '',
    'Recent transcript:',
    transcript || 'None yet.',
    '',
    'Latest user message:',
    options.latestUserMessage
  ].join('\n')
}
