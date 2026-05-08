import { embed } from 'ai'
import type { AppSettings } from '../../shared/app-settings'
import { EmbeddingProviderRegistryBuilder } from '../ai/provider-registry'
import { listRetrievalCandidates, type RetrievalCandidate } from './repository'

export interface RetrievedMemoryItem {
  id: string
  candidateType: RetrievalCandidate['candidateType']
  sessionId: string
  sessionTitle: string
  sourceMessageId: string
  chunkKind: RetrievalCandidate['chunkKind']
  content: string
  similarity: number
  scopeLabel: 'current-session' | 'other-session'
  updatedAt: string
}

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

export function shapeRetrievedMemoryItems(options: {
  activeSessionId: string
  candidates: RetrievalCandidate[]
  queryVector: number[]
  limit?: number
}): RetrievedMemoryItem[] {
  const limit = options.limit ?? 5

  return options.candidates
    .filter((candidate) => {
      if (!candidate.embeddingVector?.length) {
        return false
      }

      if (
        candidate.candidateType === 'session_summary' &&
        candidate.sessionId === options.activeSessionId
      ) {
        return false
      }

      return candidate.embeddingVector.length === options.queryVector.length
    })
    .map((candidate) => ({
      id: candidate.id,
      candidateType: candidate.candidateType,
      sessionId: candidate.sessionId,
      sessionTitle: candidate.sessionTitle,
      sourceMessageId: candidate.sourceMessageId,
      chunkKind: candidate.chunkKind,
      content: candidate.content,
      similarity: cosineSimilarity(options.queryVector, candidate.embeddingVector ?? []),
      scopeLabel:
        candidate.sessionId === options.activeSessionId
          ? ('current-session' as const)
          : ('other-session' as const),
      updatedAt: candidate.updatedAt
    }))
    .filter((candidate) => candidate.similarity > 0)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity
      }

      return right.updatedAt.localeCompare(left.updatedAt)
    })
    .slice(0, limit)
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

      return shapeRetrievedMemoryItems({
        activeSessionId: options.activeSessionId,
        candidates: listRetrievalCandidates(options.workspacePath),
        queryVector: embedding
      })
    } catch (error) {
      console.error('Memory retrieval failed. Falling back to transcript-only generation.', error)
      return []
    }
  }
}
