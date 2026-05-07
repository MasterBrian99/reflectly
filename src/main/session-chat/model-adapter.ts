import type { MessageRecord } from '../../shared/session-chat'
import { SessionChatAppError } from './error'

const defaultModel = 'nvidia/nemotron-3-super-120b-a12b:free'
const defaultBaseUrl = 'https://openrouter.ai/api/v1'
const systemPrompt =
  'You are Reflectly, a calm and thoughtful journaling assistant. Reply with grounded, concise, supportive reflection. Do not claim to be a therapist or offer crisis instructions unless the user explicitly asks for urgent help.'

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export async function generateAssistantReply(messages: MessageRecord[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new SessionChatAppError(
      'MODEL_CONFIG_MISSING',
      'OpenAI is not configured. Set OPENAI_API_KEY and try again.'
    )
  }

  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL?.trim() || defaultBaseUrl)
  const model = process.env.OPENAI_MODEL?.trim() || defaultModel

  let response: Response

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        ]
      })
    })
  } catch {
    throw new SessionChatAppError(
      'MODEL_REQUEST_FAILED',
      'Reflectly could not reach the model provider. Try again in a moment.',
      true
    )
  }

  const payload = (await response.json().catch(() => ({}))) as OpenAiChatCompletionResponse

  if (!response.ok) {
    throw new SessionChatAppError(
      'MODEL_REQUEST_FAILED',
      payload.error?.message ||
        'Reflectly could not generate a reply right now. Try again in a moment.',
      response.status === 429 || response.status >= 500
    )
  }

  const assistantContent = payload.choices?.[0]?.message?.content?.trim()

  if (!assistantContent) {
    throw new SessionChatAppError(
      'MODEL_RESPONSE_INVALID',
      'The model returned an empty reply. Try again.',
      true
    )
  }

  return assistantContent
}
