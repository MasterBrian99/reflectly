import type { GetSessionRequest, SendMessageRequest } from '@shared/session-chat'

export const sessionIpcService = {
  listSessions: () => window.api.listSessions(),
  createSession: () => window.api.createSession(),
  getSession: (request: GetSessionRequest) => window.api.getSession(request),
  sendMessage: (request: SendMessageRequest) => window.api.sendMessage(request)
}
