import { embed } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import { EmbeddingProviderRegistryBuilder } from '../ai/provider-registry'
import { searchMemoryByVector, type VectorSearchResult } from './repository'

export interface RetrievedMemoryItem {
  id: string
  candidateType: VectorSearchResult['candidateType']
  sessionId: string
  sessionTitle: string
  sourceMessageId: string
  chunkKind: VectorSearchResult['chunkKind']
  content: string
  similarity: number
  scopeLabel: 'current-session' | 'other-session'
  updatedAt: string
}

/**
 * Computes cosine similarity between two equal-length vectors.
 * Kept as a utility for tests and fallback scenarios.
 */
export function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) {
    return 0
  }

  let dotProduct = 0
  let leftMagnitude = 0
  let rightMagnitude = 0

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]
    const rightValue = right[index]

    dotProduct += leftValue * rightValue
    leftMagnitude += leftValue * leftValue
    rightMagnitude += rightValue * rightValue
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}

function mapSearchResultToMemoryItem(
  result: VectorSearchResult,
  activeSessionId: string
): RetrievedMemoryItem {
  return {
    id: result.id,
    candidateType: result.candidateType,
    sessionId: result.sessionId,
    sessionTitle: result.sessionTitle,
    sourceMessageId: result.sourceMessageId,
    chunkKind: result.chunkKind,
    content: result.content,
    similarity: Math.max(0, 1 - result.distance),
    scopeLabel: result.sessionId === activeSessionId ? 'current-session' : 'other-session',
    updatedAt: result.updatedAt
  }
}

export class MemoryRetrievalService {
  async retrieve(options: {
    workspacePath: string
    settings: AppSettings
    activeSessionId: string
    queryText: string
  }): Promise<RetrievedMemoryItem[]> {
    if (!options.queryText.trim()) {
      return []
    }

    const registry = new EmbeddingProviderRegistryBuilder(options.settings)

    if (!registry.isConfigured()) {
      return []
    }

    try {
      const { model } = registry.build()
      const { embedding } = await embed({
        model,
        value: options.queryText,
        maxRetries: 1
      })

      const results = searchMemoryByVector(options.workspacePath, {
        activeSessionId: options.activeSessionId,
        queryVector: embedding,
        limit: 5,
        embeddingDimension: embedding.length
      })

      return results.map((r) => mapSearchResultToMemoryItem(r, options.activeSessionId))
    } catch (error) {
      console.error('Memory retrieval failed. Falling back to transcript-only generation.', error)
      return []
    }
  }
}
