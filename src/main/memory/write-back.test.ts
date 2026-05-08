import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMemoryWriteBackResult } from './write-back'

test('parseMemoryWriteBackResult reads strict JSON payloads', () => {
  const parsed = parseMemoryWriteBackResult(
    '{"turnSummary":"The user wants help slowing down tonight.","sessionSummary":"The session centers on stress and the user is practicing gentler evening routines."}'
  )

  assert.deepEqual(parsed, {
    turnSummary: 'The user wants help slowing down tonight.',
    sessionSummary:
      'The session centers on stress and the user is practicing gentler evening routines.'
  })
})

test('parseMemoryWriteBackResult accepts fenced JSON and rejects missing fields', () => {
  const parsed = parseMemoryWriteBackResult(
    '```json\n{"turnSummary":"Short turn memory","sessionSummary":"Longer running summary"}\n```'
  )

  assert.equal(parsed?.turnSummary, 'Short turn memory')
  assert.equal(parseMemoryWriteBackResult('{"turnSummary":"missing session"}'), null)
})
