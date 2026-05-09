import assert from 'node:assert/strict'
import test from 'node:test'
import type { Stage1ParseOutput } from '../stage1/types'
import { buildFallbackStage3Output, parseStage3ReasoningOutput } from './reasoner'
import { buildStage3Prompt } from './prompts'

const validPayload = {
  schemaVersion: 1,
  messageId: 'model-message-id',
  sessionId: 'model-session-id',
  supportMode: 'reflective',
  depthLevel: 'moderate',
  responseGoal: 'Help the user explore what feels stuck.',
  emotionalHypothesis: {
    summary: 'The user seems frustrated but open to reflection.',
    evidence: ['I feel stuck', 'repeated use of uncertain language'],
    confidence: 0.72
  },
  memoryUse: {
    relevantMemoryIds: ['mem-1', 'mem-2'],
    summary: 'Past session mentioned similar frustration about work.',
    caution: 'Do not assume the same work context applies.'
  },
  responsePlan: {
    openingMove: 'Acknowledge the feeling of being stuck.',
    keyPoints: ['Reflect the frustration.', 'Gently ask what area feels most stuck.'],
    suggestedQuestion: 'What part of this feels most stuck right now?',
    avoid: ['Giving unsolicited advice.', 'Diagnosing burnout.']
  },
  safetyNotes: {
    hasActiveRiskMarkers: false,
    notes: []
  }
}

const minimalStage1Output: Stage1ParseOutput = {
  schemaVersion: 1,
  messageId: 'message-a',
  sessionId: 'session-a',
  summary: 'The user wants a calmer evening.',
  emotionalTone: {
    primary: 'tired',
    secondary: [],
    valence: -0.2,
    arousal: 0.3,
    confidence: 0.7
  },
  intent: {
    expressed: 'I want tonight to feel calmer.',
    inferred: 'The user wants reflective support.',
    category: 'reflect',
    confidence: 0.7
  },
  entities: [],
  goalHints: [],
  contextGaps: [],
  riskMarkers: [],
  shouldClarify: false
}

test('parseStage3ReasoningOutput accepts valid model JSON and stamps trusted IDs', () => {
  const parsed = parseStage3ReasoningOutput(JSON.stringify(validPayload), {
    messageId: 'message-a',
    sessionId: 'session-a'
  })

  assert.ok(parsed)
  assert.equal(parsed.messageId, 'message-a')
  assert.equal(parsed.sessionId, 'session-a')
  assert.equal(parsed.supportMode, 'reflective')
  assert.equal(parsed.depthLevel, 'moderate')
  assert.equal(parsed.responseGoal, 'Help the user explore what feels stuck.')
  assert.equal(parsed.emotionalHypothesis.confidence, 0.72)
  assert.deepEqual(parsed.memoryUse.relevantMemoryIds, ['mem-1', 'mem-2'])
  assert.equal(parsed.responsePlan.openingMove, 'Acknowledge the feeling of being stuck.')
  assert.equal(parsed.responsePlan.keyPoints.length, 2)
  assert.equal(parsed.safetyNotes.hasActiveRiskMarkers, false)
})

test('buildStage3Prompt includes session intention when available', () => {
  const prompt = buildStage3Prompt({
    messageId: 'message-a',
    sessionId: 'session-a',
    latestUserMessage: 'I want tonight to feel calmer.',
    sessionIntention: 'Make sense of my stress before bed.',
    currentSessionSummary: null,
    recentTranscript: [],
    stage1Output: minimalStage1Output,
    retrievedMemory: []
  })

  assert.ok(prompt.includes('Session intention (set by user at session start):'))
  assert.ok(prompt.includes('Make sense of my stress before bed.'))
  assert.ok(prompt.includes('Consider this intention'))
})

test('parseStage3ReasoningOutput extracts JSON from markdown code fences', () => {
  const fenced = '```json\n' + JSON.stringify(validPayload) + '\n```'
  const parsed = parseStage3ReasoningOutput(fenced, {
    messageId: 'message-b',
    sessionId: 'session-b'
  })

  assert.ok(parsed)
  assert.equal(parsed.messageId, 'message-b')
  assert.equal(parsed.supportMode, 'reflective')
})

test('parseStage3ReasoningOutput rejects non-JSON text', () => {
  const result = parseStage3ReasoningOutput('not json at all', {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects missing schemaVersion', () => {
  const invalid = { ...validPayload, schemaVersion: undefined }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects wrong schemaVersion', () => {
  const invalid = { ...validPayload, schemaVersion: 2 }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects invalid supportMode', () => {
  const invalid = { ...validPayload, supportMode: 'diagnose' }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects invalid depthLevel', () => {
  const invalid = { ...validPayload, depthLevel: 'maximum' }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects missing emotionalHypothesis', () => {
  const invalid = { ...validPayload, emotionalHypothesis: 'not-an-object' }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput rejects missing responsePlan.openingMove', () => {
  const invalid = {
    ...validPayload,
    responsePlan: { ...validPayload.responsePlan, openingMove: '' }
  }
  const result = parseStage3ReasoningOutput(JSON.stringify(invalid), {
    messageId: 'm',
    sessionId: 's'
  })

  assert.equal(result, null)
})

test('parseStage3ReasoningOutput omits optional fields when absent', () => {
  const minimal = {
    ...validPayload,
    memoryUse: {
      relevantMemoryIds: [],
      summary: 'No memory available.'
    },
    responsePlan: {
      openingMove: 'Greet the user.',
      keyPoints: [],
      avoid: []
    }
  }
  const parsed = parseStage3ReasoningOutput(JSON.stringify(minimal), {
    messageId: 'message-c',
    sessionId: 'session-c'
  })

  assert.ok(parsed)
  assert.equal(parsed.memoryUse.caution, undefined)
  assert.equal(parsed.responsePlan.suggestedQuestion, undefined)
})

test('buildFallbackStage3Output produces a minimal non-blocking output', () => {
  const fallback = buildFallbackStage3Output({
    messageId: 'message-a',
    sessionId: 'session-a',
    stage1Summary: 'The user shared a frustration.',
    userMessage: 'I feel overwhelmed today.'
  })

  assert.equal(fallback.supportMode, 'supportive')
  assert.equal(fallback.depthLevel, 'light')
  assert.equal(fallback.responseGoal, 'The user shared a frustration.')
  assert.equal(fallback.emotionalHypothesis.confidence, 0)
  assert.equal(fallback.safetyNotes.hasActiveRiskMarkers, false)
})

test('buildFallbackStage3Output uses userMessage when stage1Summary is missing', () => {
  const fallback = buildFallbackStage3Output({
    messageId: 'message-a',
    sessionId: 'session-a',
    userMessage: 'I need some help today.'
  })

  assert.equal(fallback.responseGoal, 'I need some help today.')
})

test('buildFallbackStage3Output includes retrieved memory IDs when available', () => {
  const fallback = buildFallbackStage3Output({
    messageId: 'message-a',
    sessionId: 'session-a',
    userMessage: 'Tell me about last week.',
    retrievedMemoryIds: ['mem-1', 'mem-2']
  })

  assert.deepEqual(fallback.memoryUse.relevantMemoryIds, ['mem-1', 'mem-2'])
  assert.ok(fallback.memoryUse.caution?.includes('Fallback'))
})

test('buildFallbackStage3Output reflects risk markers', () => {
  const fallback = buildFallbackStage3Output({
    messageId: 'message-a',
    sessionId: 'session-a',
    userMessage: 'I feel hopeless.',
    hasRiskMarkers: true
  })

  assert.equal(fallback.safetyNotes.hasActiveRiskMarkers, true)
  assert.ok(fallback.safetyNotes.notes.length > 0)
})
