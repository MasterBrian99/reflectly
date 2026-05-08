import assert from 'node:assert/strict'
import test from 'node:test'
import type { RetrievalCandidate } from './repository'
import { cosineSimilarity, shapeRetrievedMemoryItems, MemoryRetrievalService } from './retrieval'

test('cosineSimilarity returns zero for mismatched vectors and ranks aligned vectors higher', () => {
  assert.equal(cosineSimilarity([1, 0], [1]), 0)
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0)
  assert.ok(cosineSimilarity([1, 0], [1, 0]) > cosineSimilarity([1, 0], [0, 1]))
})

test('shapeRetrievedMemoryItems excludes the active session summary and keeps top bounded matches', () => {
  const candidates: RetrievalCandidate[] = [
    {
      id: 'summary-current',
      candidateType: 'session_summary',
      sessionId: 'session-a',
      sessionTitle: 'Current session',
      sourceMessageId: 'msg-1',
      chunkKind: 'session_summary',
      content: 'should be excluded',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      embeddingVector: [1, 0],
      updatedAt: '2026-05-07T10:00:00.000Z'
    },
    {
      id: 'turn-current',
      candidateType: 'memory_chunk',
      sessionId: 'session-a',
      sessionTitle: 'Current session',
      sourceMessageId: 'msg-2',
      chunkKind: 'turn_summary',
      content: 'same session memory',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      embeddingVector: [0.9, 0.1],
      updatedAt: '2026-05-07T10:01:00.000Z'
    },
    {
      id: 'turn-other',
      candidateType: 'memory_chunk',
      sessionId: 'session-b',
      sessionTitle: 'Other session',
      sourceMessageId: 'msg-3',
      chunkKind: 'turn_summary',
      content: 'other session memory',
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      embeddingVector: [1, 0],
      updatedAt: '2026-05-07T10:02:00.000Z'
    }
  ]

  const ranked = shapeRetrievedMemoryItems({
    activeSessionId: 'session-a',
    candidates,
    queryVector: [1, 0],
    limit: 5
  })

  assert.equal(ranked.length, 2)
  assert.deepEqual(
    ranked.map((item) => item.id),
    ['turn-other', 'turn-current']
  )
  assert.equal(ranked[0].scopeLabel, 'other-session')
  assert.equal(ranked[1].scopeLabel, 'current-session')
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
