import type {
  BeginSessionClosingRequest,
  CloseSessionRequest,
  GetSessionRequest,
  SendMessageRequest,
  SetSessionIntentionRequest
} from '@shared/session-chat'

export const sessionIpcService = {
  listSessions: () => window.api.listSessions(),
  createSession: () => window.api.createSession(),
  getSession: (request: GetSessionRequest) => window.api.getSession(request),
  setSessionIntention: (request: SetSessionIntentionRequest) =>
    window.api.setSessionIntention(request),
  beginSessionClosing: (request: BeginSessionClosingRequest) =>
    window.api.beginSessionClosing(request),
  closeSession: (request: CloseSessionRequest) => window.api.closeSession(request),
  sendMessage: (request: SendMessageRequest) => window.api.sendMessage(request),
  onChatStreamEvent: (listener: Parameters<typeof window.api.onChatStreamEvent>[0]) =>
    window.api.onChatStreamEvent(listener)
}
