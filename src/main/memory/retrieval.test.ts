import assert from 'node:assert/strict'
import test from 'node:test'
import { cosineSimilarity, MemoryRetrievalService } from './retrieval'

test('cosineSimilarity returns zero for mismatched vectors and ranks aligned vectors higher', () => {
  assert.equal(cosineSimilarity([1, 0], [1]), 0)
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0)
  assert.ok(cosineSimilarity([1, 0], [1, 0]) > cosineSimilarity([1, 0], [0, 1]))
})

test('cosineSimilarity returns 1 for identical unit vectors', () => {
  const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0])
  assert.ok(Math.abs(similarity - 1.0) < 1e-10)
})

test('cosineSimilarity returns 0 for orthogonal vectors', () => {
  const similarity = cosineSimilarity([1, 0], [0, 1])
  assert.ok(Math.abs(similarity) < 1e-10)
})

test('MemoryRetrievalService falls back to transcript-only mode when embeddings are not configured', async () => {
  const retrievalService = new MemoryRetrievalService()
  const retrievedMemory = await retrievalService.retrieve({
    workspacePath: '/tmp/unused-workspace',
    activeSessionId: 'session-a',
    queryText: 'Remember this',
    settings: {
      chat: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      stage1: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      stage3: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      embeddings: {
        providerId: 'openai',
        modelId: 'text-embedding-3-small',
        apiKey: ''
      },
      agentActivity: {
        showInChat: true,
        showModelReasoning: false,
        reasoningEffort: 'low',
        reasoningSummary: 'auto'
      }
    }
  })

  assert.deepEqual(retrievedMemory, [])
})

test('MemoryRetrievalService returns empty for blank query text', async () => {
  const retrievalService = new MemoryRetrievalService()
  const retrievedMemory = await retrievalService.retrieve({
    workspacePath: '/tmp/unused-workspace',
    activeSessionId: 'session-a',
    queryText: '   ',
    settings: {
      chat: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      stage1: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      stage3: {
        providerId: 'openai',
        modelId: 'gpt-4.1-mini',
        apiKey: 'chat-key'
      },
      embeddings: {
        providerId: 'openai',
        modelId: 'text-embedding-3-small',
        apiKey: 'embedding-key'
      },
      agentActivity: {
        showInChat: true,
        showModelReasoning: false,
        reasoningEffort: 'low',
        reasoningSummary: 'auto'
      }
    }
  })

  assert.deepEqual(retrievedMemory, [])
})
