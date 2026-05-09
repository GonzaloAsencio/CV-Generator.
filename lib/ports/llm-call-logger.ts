export type LlmCallKind = 'cv' | 'speech'

export interface LlmCallLog {
  userId: string
  kind: LlmCallKind
  prompt: string
  response: string | null
  parsedOk: boolean
  retryCount: number
  latencyMs: number
  error?: string
}

export interface LlmCallLogger {
  log(entry: LlmCallLog): Promise<void>
}

export const noopLlmCallLogger: LlmCallLogger = {
  log: async () => {},
}
