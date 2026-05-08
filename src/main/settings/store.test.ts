import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAppSettings } from './normalize'

test('normalizeAppSettings upgrades legacy chat-only settings', () => {
  const normalized = normalizeAppSettings({
    activeProviderId: 'custom-openai-compatible',
    modelId: ' local-model ',
    customBaseUrl: ' http://localhost:11434/v1 ',
    providerApiKeys: {
      'custom-openai-compatible': ' secret-key '
    }
  })

  assert.deepEqual(normalized, {
    chat: {
      providerId: 'custom-openai-compatible',
      modelId: 'local-model',
      apiKey: 'secret-key',
      baseUrl: 'http://localhost:11434/v1'
    },
    embeddings: {
      providerId: 'openai',
      modelId: 'text-embedding-3-small',
      apiKey: '',
      baseUrl: undefined
    },
    agentActivity: {
      showInChat: true,
      showModelReasoning: false,
      reasoningEffort: 'low',
      reasoningSummary: 'auto'
    }
  })
})

test('normalizeAppSettings fills defaults for new chat and embedding sections', () => {
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
  assert.equal(normalized.embeddings.providerId, 'custom-openai-compatible')
  assert.equal(normalized.embeddings.modelId, 'text-embedding-3-small')
  assert.equal(normalized.embeddings.apiKey, 'embed-key')
  assert.equal(normalized.embeddings.baseUrl, 'http://localhost:1234/v1')
  assert.equal(normalized.agentActivity.showInChat, true)
  assert.equal(normalized.agentActivity.showModelReasoning, false)
  assert.equal(normalized.agentActivity.reasoningEffort, 'low')
  assert.equal(normalized.agentActivity.reasoningSummary, 'auto')
})
