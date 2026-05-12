import type { LlmProvider, LlmOptions, LlmResult } from '@/lib/ports/llm-provider'

const DEFAULT_BASE_URL = 'http://localhost:1234'
const DEFAULT_MODEL = 'gemma-4-8b'

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAiRequestBody {
  model: string
  messages: OpenAiMessage[]
}

interface OpenAiChoice {
  message: { role: string; content: string }
  finish_reason: string
}

interface OpenAiChatResponse {
  id: string
  object: string
  model: string
  choices: OpenAiChoice[]
}

export class LmStudioLlmProvider implements LlmProvider {
  private readonly baseUrl: string
  private readonly model: string

  constructor(
    baseUrl: string = DEFAULT_BASE_URL,
    model: string = DEFAULT_MODEL,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.model = model
  }

  async complete(opts: LlmOptions): Promise<LlmResult> {
    const start = Date.now()

    const body: OpenAiRequestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user',   content: opts.userPrompt },
      ],
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LM Studio request failed: HTTP ${response.status} — ${errorText}`)
    }

    const data = (await response.json()) as OpenAiChatResponse
    const content = data.choices[0]?.message?.content

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('LM Studio returned an empty or malformed response')
    }

    return { text: content, latencyMs: Date.now() - start }
  }
}
