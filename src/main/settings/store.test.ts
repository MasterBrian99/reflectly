import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAppSettings } from './normalize'

test('normalizeAppSettings fills defaults for all stages', () => {
  const normalized = normalizeAppSettings({
    chat: {
      providerId: 'anthropic',
      modelId: '',
      apiKey: ' chat-key '
    },
    embeddings: {
      providerId: 'custom-openai-compatible',
      modelId: '',
      apiKey: ' embed-key ',
      baseUrl: ' http://localhost:1234/v1 '
    }
  })

  assert.equal(normalized.chat.providerId, 'anthropic')
  assert.equal(normalized.chat.modelId, 'claude-3-7-sonnet-20250219')
  assert.equal(normalized.chat.apiKey, 'chat-key')
  assert.equal(normalized.chat.baseUrl, undefined)

  assert.equal(normalized.stage1.providerId, 'openrouter')
  assert.equal(normalized.stage1.modelId, 'openai/gpt-4.1-mini')
  assert.equal(normalized.stage1.apiKey, '')

  assert.equal(normalized.stage3.providerId, 'openrouter')
  assert.equal(normalized.stage3.modelId, 'openai/gpt-4.1-mini')
  assert.equal(normalized.stage3.apiKey, '')

  assert.equal(normalized.embeddings.providerId, 'custom-openai-compatible')
  assert.equal(normalized.embeddings.modelId, 'text-embedding-3-small')
  assert.equal(normalized.embeddings.apiKey, 'embed-key')
  assert.equal(normalized.embeddings.baseUrl, 'http://localhost:1234/v1')

  assert.equal(normalized.agentActivity.showInChat, true)
  assert.equal(normalized.agentActivity.showModelReasoning, false)
  assert.equal(normalized.agentActivity.reasoningEffort, 'low')
  assert.equal(normalized.agentActivity.reasoningSummary, 'auto')
})

test('normalizeAppSettings returns full defaults when called with no arguments', () => {
  const normalized = normalizeAppSettings()

  assert.equal(normalized.chat.providerId, 'openrouter')
  assert.equal(normalized.stage1.providerId, 'openrouter')
  assert.equal(normalized.stage3.providerId, 'openrouter')
  assert.equal(normalized.embeddings.providerId, 'openai')
  assert.equal(normalized.agentActivity.showInChat, true)
})

test('normalizeAppSettings preserves stage1 and stage3 when provided', () => {
  const normalized = normalizeAppSettings({
    stage1: {
      providerId: 'anthropic',
      modelId: 'claude-3-5-haiku-20241022',
      apiKey: 'stage1-key'
    },
    stage3: {
      providerId: 'openai',
      modelId: 'gpt-4.1',
      apiKey: 'stage3-key'
    }
  })

  assert.equal(normalized.stage1.providerId, 'anthropic')
  assert.equal(normalized.stage1.modelId, 'claude-3-5-haiku-20241022')
  assert.equal(normalized.stage1.apiKey, 'stage1-key')
  assert.equal(normalized.stage3.providerId, 'openai')
  assert.equal(normalized.stage3.modelId, 'gpt-4.1')
  assert.equal(normalized.stage3.apiKey, 'stage3-key')
})
