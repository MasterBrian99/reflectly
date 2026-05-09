import type { Stage1ParseOutput, Stage1QuestionType } from './types'

export const defaultClarificationThreshold = 0.72
export const maxClarificationLoops = 2

function normalizeOptions(options?: string[]): string[] | undefined {
  const normalized = options
    ?.map((option) => option.trim())
    .filter((option) => option.length > 0)
    .slice(0, 4)

  return normalized && normalized.length >= 2 ? normalized : undefined
}

function normalizeScaleAnchors(anchors?: [string, string]): [string, string] | undefined {
  if (!anchors?.[0]?.trim() || !anchors?.[1]?.trim()) {
    return undefined
  }

  return [anchors[0].trim(), anchors[1].trim()]
}

function buildQuestionText(questionType: Stage1QuestionType): string {
  if (questionType === 'choice') {
    return 'Would it help more to talk this through, or to look for one concrete next step?'
  }

  if (questionType === 'scale') {
    return 'How much is this affecting your day-to-day right now?'
  }

  return 'What part of this feels hardest to sit with right now?'
}

export function applyClarificationRules(
  output: Stage1ParseOutput,
  options?: {
    recentLoopCount?: number
    threshold?: number
  }
): Stage1ParseOutput {
  const threshold = options?.threshold ?? defaultClarificationThreshold

  if (output.riskMarkers.length > 0 || (options?.recentLoopCount ?? 0) >= maxClarificationLoops) {
    return {
      ...output,
      shouldClarify: false,
      clarification: undefined
    }
  }

  const strongestGap = [...output.contextGaps].sort((left, right) => right.score - left.score)[0]

  if (!strongestGap || strongestGap.score < threshold) {
    return {
      ...output,
      shouldClarify: false,
      clarification: undefined
    }
  }

  const modelClarification =
    output.clarification?.gapBeingResolved === strongestGap.id ||
    output.clarification?.gapBeingResolved === strongestGap.description
      ? output.clarification
      : undefined
  const questionType = modelClarification?.questionType ?? strongestGap.questionType
  const optionsForQuestion =
    questionType === 'choice'
      ? (normalizeOptions(modelClarification?.options ?? strongestGap.options) ?? [
          'Talk it through',
          'Find one next step'
        ])
      : undefined
  const scaleAnchors =
    questionType === 'scale'
      ? (normalizeScaleAnchors(modelClarification?.scaleAnchors ?? strongestGap.scaleAnchors) ?? [
          'Barely affecting me',
          'Affecting me a lot'
        ])
      : undefined

  return {
    ...output,
    shouldClarify: true,
    clarification: {
      questionType,
      questionText: modelClarification?.questionText?.trim() || buildQuestionText(questionType),
      options: optionsForQuestion,
      scaleAnchors,
      gapBeingResolved: strongestGap.id,
      urgency: modelClarification?.urgency ?? (strongestGap.score >= 0.9 ? 'high' : 'medium')
    }
  }
}
