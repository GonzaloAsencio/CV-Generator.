import { SpeechSchema, type Speech } from '@/lib/schemas/speech.schema'
import type { LlmProvider } from '@/lib/ports/llm-provider'
import type { GenerationRepository, CompanySnapshot } from '@/lib/ports/generation-repository'
import {
  SPEECH_SYSTEM_PROMPT,
  buildSpeechUserPrompt,
  buildSpeechRetryUserPrompt,
  extractJsonFromLlmText,
} from '@/lib/utils/prompt-builder'

// ─── errors ──────────────────────────────────────────────────────────────────

export class NoCvUploadedForSpeechError extends Error {
  constructor() {
    super('No CV uploaded for this user')
    this.name = 'NoCvUploadedForSpeechError'
  }
}

export class LlmInvalidSpeechOutputError extends Error {
  constructor(public readonly validationDetail: string) {
    super(`LLM returned invalid speech JSON after retry: ${validationDetail}`)
    this.name = 'LlmInvalidSpeechOutputError'
  }
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface GenerateSpeechInput {
  userId: string
  cvText: string
  jobOffer: string
  company: CompanySnapshot
  idempotencyKey?: string
  generatedCvId?: string
}

export interface GenerateSpeechOutput {
  speech: Speech
  generationId: string
  chunksUsed: number
  topSimilarity: number
}

// ─── use case ────────────────────────────────────────────────────────────────

export class GenerateSpeechUseCase {
  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly generationRepository: GenerationRepository,
  ) {}

  async execute(input: GenerateSpeechInput): Promise<GenerateSpeechOutput> {
    const { userId, cvText, jobOffer, company, idempotencyKey, generatedCvId } = input

    const systemPrompt = SPEECH_SYSTEM_PROMPT
    const userPrompt = buildSpeechUserPrompt(cvText, company, jobOffer)

    const { speech } = await this.callLlmWithRetry(systemPrompt, userPrompt, company)

    const { id: generationId } = await this.generationRepository.saveSpeech({
      userId,
      speechData: speech,
      company,
      generatedCvId,
      idempotencyKey,
    })

    return { speech, generationId, chunksUsed: 0, topSimilarity: 1 }
  }

  private async callLlmWithRetry(
    systemPrompt: string,
    userPrompt: string,
    company: CompanySnapshot,
  ): Promise<{ speech: Speech }> {
    const first = await this.llmProvider.complete({ systemPrompt, userPrompt })
    const firstParsed = this.tryParse(first.text, company)

    if (firstParsed.success) return { speech: firstParsed.data }

    const retryPrompt = buildSpeechRetryUserPrompt(userPrompt, first.text, `Error de validación: ${firstParsed.error}`)
    const second = await this.llmProvider.complete({ systemPrompt, userPrompt: retryPrompt })
    const secondParsed = this.tryParse(second.text, company)

    if (secondParsed.success) return { speech: secondParsed.data }

    throw new LlmInvalidSpeechOutputError(secondParsed.error)
  }

  private tryParse(
    text: string,
    company: CompanySnapshot,
  ): { success: true; data: Speech } | { success: false; error: string } {
    try {
      const json = extractJsonFromLlmText(text)
      const result = SpeechSchema.safeParse(json)
      if (!result.success) return { success: false, error: JSON.stringify(result.error.issues) }

      const speech = result.data
      const lower = speech.full_text.toLowerCase()

      if (!lower.includes(company.name.toLowerCase())) {
        return { success: false, error: `Speech must mention company name "${company.name}"` }
      }

      if (company.techStack && company.techStack.length > 0) {
        const mentionsTech = company.techStack.some((t) => lower.includes(t.toLowerCase()))
        if (!mentionsTech) {
          return {
            success: false,
            error: `Speech must mention at least one tech from stack: ${company.techStack.join(', ')}`,
          }
        }
      }

      return { success: true, data: speech }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
}
