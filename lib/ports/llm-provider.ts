export interface LlmOptions {
  systemPrompt: string
  userPrompt: string
}

export interface LlmResult {
  text: string
  latencyMs: number
}

export interface LlmProvider {
  complete(opts: LlmOptions): Promise<LlmResult>
}
