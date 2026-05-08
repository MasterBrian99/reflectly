import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateSafetyGate, selectHighestPriorityRiskMarker } from './gate'
import type { SafetyRiskMarker } from './types'

function marker(input: Partial<SafetyRiskMarker> = {}): SafetyRiskMarker {
  return {
    type: input.type ?? 'other',
    severity: input.severity ?? 'low',
    evidence: input.evidence ?? 'test evidence',
    confidence: input.confidence ?? 0.8
  }
}

test('safety gate proceeds when there are no markers', () => {
  const decision = evaluateSafetyGate([])

  assert.equal(decision.action, 'proceed')
  assert.equal(decision.marker, null)
})

test('safety gate interrupts for suicidal ideation', () => {
  const decision = evaluateSafetyGate([marker({ type: 'suicidal_ideation', severity: 'low' })])

  assert.equal(decision.action, 'crisis_interrupt')
  assert.equal(decision.marker?.type, 'suicidal_ideation')
})

test('safety gate interrupts for self harm', () => {
  const decision = evaluateSafetyGate([marker({ type: 'self_harm', severity: 'low' })])

  assert.equal(decision.action, 'crisis_interrupt')
  assert.equal(decision.marker?.type, 'self_harm')
})

test('safety gate interrupts for harm to others', () => {
  const decision = evaluateSafetyGate([marker({ type: 'harm_to_others', severity: 'low' })])

  assert.equal(decision.action, 'crisis_interrupt')
  assert.equal(decision.marker?.type, 'harm_to_others')
})

test('safety gate interrupts for high and critical severity', () => {
  assert.equal(
    evaluateSafetyGate([marker({ type: 'other', severity: 'high' })]).action,
    'crisis_interrupt'
  )
  assert.equal(
    evaluateSafetyGate([marker({ type: 'acute_distress', severity: 'critical' })]).action,
    'crisis_interrupt'
  )
})

test('safety gate returns supportive notice for medium acute distress and abuse', () => {
  assert.equal(
    evaluateSafetyGate([marker({ type: 'acute_distress', severity: 'medium' })]).action,
    'supportive_notice'
  )
  assert.equal(
    evaluateSafetyGate([marker({ type: 'abuse', severity: 'medium' })]).action,
    'supportive_notice'
  )
})

test('safety gate selects the highest-priority marker deterministically', () => {
  const selectedMarker = selectHighestPriorityRiskMarker([
    marker({ type: 'acute_distress', severity: 'medium', evidence: 'medium distress' }),
    marker({ type: 'self_harm', severity: 'low', evidence: 'self harm' }),
    marker({ type: 'other', severity: 'critical', evidence: 'critical marker' }),
    marker({ type: 'suicidal_ideation', severity: 'medium', evidence: 'suicidal ideation' })
  ])

  assert.equal(selectedMarker?.evidence, 'critical marker')
})
