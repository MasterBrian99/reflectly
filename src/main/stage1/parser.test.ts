import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFallbackStage1ParseOutput, parseStage1ParseOutput } from './parser'

const validPayload = {
  schemaVersion: 1,
  messageId: 'model-message-id',
  sessionId: 'model-session-id',
  summary: 'The user feels stuck and is unsure what would help.',
  emotionalTone: {
    primary: 'stuck',
    secondary: ['uncertain'],
    valence: -0.3,
    arousal: 0.4,
    confidence: 0.7
  },
  intent: {
    expressed: 'The user does not know what to do.',
    inferred: 'They may want reflection or one next step.',
    category: 'reflect',
    confidence: 0.76
  },
  entities: [
    {
      type: 'concept',
      name: 'feeling stuck',
      sentiment: 'negative'
    }
  ],
  goalHints: [
    {
      description: 'Understand what feels stuck.',
      status: 'unclear'
    }
  ],
  contextGaps: [
    {
      id: 'preferred-help',
      description: 'Whether the user wants reflection or advice.',
      whyItMatters: 'The next assistant response would differ.',
      score: 0.82,
      questionType: 'choice',
      options: ['Talk it through', 'Find one next step']
    }
  ],
  riskMarkers: [],
  shouldClarify: true,
  clarification: {
    questionType: 'choice',
    questionText: 'Would it help more to talk this through, or find one concrete next step?',
    options: ['Talk it through', 'Find one next step'],
    gapBeingResolved: 'preferred-help',
    urgency: 'medium'
  }
}

test('parseStage1ParseOutput accepts valid model JSON and stamps trusted IDs', () => {
  const parsed = parseStage1ParseOutput(JSON.stringify(validPayload), {
    messageId: 'message-a',
    sessionId: 'session-a'
  })

  assert.equal(parsed?.messageId, 'message-a')
  assert.equal(parsed?.sessionId, 'session-a')
  assert.equal(parsed?.intent.category, 'reflect')
  assert.equal(parsed?.clarification?.questionType, 'choice')
})

test('parseStage1ParseOutput rejects malformed or incomplete JSON', () => {
  assert.equal(parseStage1ParseOutput('not json', { messageId: 'm', sessionId: 's' }), null)
  assert.equal(
    parseStage1ParseOutput(JSON.stringify({ ...validPayload, emotionalTone: undefined }), {
      messageId: 'm',
      sessionId: 's'
    }),
    null
  )
})

test('buildFallbackStage1ParseOutput produces a minimal non-blocking output', () => {
  const fallback = buildFallbackStage1ParseOutput({
    messageId: 'message-a',
    sessionId: 'session-a',
    content: 'I am not sure what to say.'
  })

  assert.equal(fallback.shouldClarify, false)
  assert.equal(fallback.riskMarkers.length, 0)
  assert.equal(fallback.summary, 'I am not sure what to say.')
})

test('buildFallbackStage1ParseOutput keeps a conservative clarification gap for stuck messages', () => {
  const fallback = buildFallbackStage1ParseOutput({
    messageId: 'message-a',
    sessionId: 'session-a',
    content: "I feel stuck and I don't know what to do."
  })

  assert.equal(fallback.contextGaps[0]?.questionType, 'choice')
  assert.deepEqual(fallback.contextGaps[0]?.options, ['Talk it through', 'Find one next step'])
})

test('buildFallbackStage1ParseOutput marks obvious risk phrases without clarification gaps', () => {
  const fallback = buildFallbackStage1ParseOutput({
    messageId: 'message-a',
    sessionId: 'session-a',
    content: 'I feel like hurting myself.'
  })

  assert.equal(fallback.contextGaps.length, 0)
  assert.equal(fallback.riskMarkers[0]?.type, 'self_harm')
  assert.equal(fallback.intent.category, 'crisis_signal')
})

test('buildFallbackStage1ParseOutput detects expanded fallback risk phrases', () => {
  const cases = [
    ['I want to disappear.', 'suicidal_ideation'],
    ["I can't go on.", 'suicidal_ideation'],
    ['I cannot go on.', 'suicidal_ideation'],
    ['I might hurt myself.', 'self_harm'],
    ['I want to hurt myself.', 'self_harm'],
    ['I want to hurt someone.', 'harm_to_others'],
    ['I might hurt someone.', 'harm_to_others']
  ] as const

  for (const [content, expectedType] of cases) {
    const fallback = buildFallbackStage1ParseOutput({
      messageId: 'message-a',
      sessionId: 'session-a',
      content
    })

    assert.equal(fallback.contextGaps.length, 0, content)
    assert.equal(fallback.riskMarkers[0]?.type, expectedType, content)
    assert.equal(fallback.intent.category, 'crisis_signal', content)
  }
})
