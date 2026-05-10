import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LlmProvider, LlmOptions, LlmResult } from '@/lib/ports/llm-provider'

const DEFAULT_MODEL = 'gemini-2.5-flash'

export class GeminiLlmProvider implements LlmProvider {
  private readonly genAI: GoogleGenerativeAI

  constructor(
    apiKey: string,
    private readonly model = DEFAULT_MODEL,
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async complete(opts: LlmOptions): Promise<LlmResult> {
    const start = Date.now()
    const generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: opts.systemPrompt,
    })
    const result = await generativeModel.generateContent(opts.userPrompt)
    return {
      text: result.response.text(),
      latencyMs: Date.now() - start,
    }
  }
}
