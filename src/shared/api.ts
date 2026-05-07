import type { SessionChatApi } from './session-chat'
import type { WorkspaceApi } from './workspace'

export interface AppApi extends WorkspaceApi, SessionChatApi {}
