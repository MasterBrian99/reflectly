import assert from 'node:assert/strict'
import test from 'node:test'
import { applyClarificationRules } from './clarification'
import type { Stage1ParseOutput } from './types'

function buildParseOutput(overrides?: Partial<Stage1ParseOutput>): Stage1ParseOutput {
  return {
    schemaVersion: 1,
    messageId: 'message-a',
    sessionId: 'session-a',
    summary: 'The user feels stuck.',
    emotionalTone: {
      primary: 'stuck',
      secondary: [],
      valence: -0.2,
      arousal: 0.3,
      confidence: 0.7
    },
    intent: {
      expressed: 'The user feels stuck.',
      inferred: 'They may want reflection or one next step.',
      category: 'reflect',
      confidence: 0.72
    },
    entities: [],
    goalHints: [],
    contextGaps: [
      {
        id: 'low-gap',
        description: 'A minor unknown.',
        whyItMatters: 'It probably will not change the response.',
        score: 0.35,
        questionType: 'open'
      },
      {
        id: 'strong-gap',
        description: 'The kind of help the user wants.',
        whyItMatters: 'The next response could be reflective or practical.',
        score: 0.83,
        questionType: 'choice',
        options: ['Talk it through', 'Find one next step']
      }
    ],
    riskMarkers: [],
    shouldClarify: false,
    ...overrides
  }
}

test('applyClarificationRules picks the highest-scoring context gap above threshold', () => {
  const output = applyClarificationRules(buildParseOutput())

  assert.equal(output.shouldClarify, true)
  assert.equal(output.clarification?.gapBeingResolved, 'strong-gap')
  assert.deepEqual(output.clarification?.options, ['Talk it through', 'Find one next step'])
})

test('applyClarificationRules suppresses clarification when risk markers exist', () => {
  const output = applyClarificationRules(
    buildParseOutput({
      riskMarkers: [
        {
          type: 'acute_distress',
          severity: 'medium',
          evidence: 'The user says they cannot calm down.',
          confidence: 0.74
        }
      ]
    })
  )

  assert.equal(output.shouldClarify, false)
  assert.equal(output.clarification, undefined)
})

test('applyClarificationRules suppresses clarification when loop count is already two', () => {
  const output = applyClarificationRules(buildParseOutput(), {
    recentLoopCount: 2
  })

  assert.equal(output.shouldClarify, false)
  assert.equal(output.clarification, undefined)
})

test('applyClarificationRules suppresses clarification below threshold', () => {
  const output = applyClarificationRules(buildParseOutput(), {
    threshold: 0.9
  })

  assert.equal(output.shouldClarify, false)
  assert.equal(output.clarification, undefined)
})

test('applyClarificationRules can shape an open clarification question', () => {
  const output = applyClarificationRules(
    buildParseOutput({
      contextGaps: [
        {
          id: 'hardest-part',
          description: 'The hardest part of the situation is unclear.',
          whyItMatters: 'The assistant can reflect more precisely with this context.',
          score: 0.81,
          questionType: 'open'
        }
      ]
    })
  )

  assert.equal(output.shouldClarify, true)
  assert.equal(output.clarification?.questionType, 'open')
  assert.equal(
    output.clarification?.questionText,
    'What part of this feels hardest to sit with right now?'
  )
  assert.equal(output.clarification?.options, undefined)
})

test('applyClarificationRules can shape a scale clarification question', () => {
  const output = applyClarificationRules(
    buildParseOutput({
      contextGaps: [
        {
          id: 'impact-level',
          description: 'The current impact level is unclear.',
          whyItMatters: 'The assistant can calibrate the response to the level of distress.',
          score: 0.84,
          questionType: 'scale',
          scaleAnchors: ['Barely affecting me', 'Affecting me a lot']
        }
      ]
    })
  )

  assert.equal(output.shouldClarify, true)
  assert.equal(output.clarification?.questionType, 'scale')
  assert.deepEqual(output.clarification?.scaleAnchors, [
    'Barely affecting me',
    'Affecting me a lot'
  ])
  assert.equal(output.clarification?.options, undefined)
})
