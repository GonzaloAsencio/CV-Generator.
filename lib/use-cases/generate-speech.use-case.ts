import { SpeechSchema, type Speech } from '@/lib/schemas/speech.schema'
import type { EmbeddingProvider } from '@/lib/ports/embedding-provider'
import type { CvRepository } from '@/lib/ports/cv-repository'
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
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly cvRepository: CvRepository,
    private readonly llmProvider: LlmProvider,
    private readonly generationRepository: GenerationRepository,
  ) {}

  async execute(input: GenerateSpeechInput): Promise<GenerateSpeechOutput> {
    const { userId, jobOffer, company, idempotencyKey, generatedCvId } = input

    // Ciclo 1: embed job offer
    const vector = await this.embeddingProvider.embed(jobOffer)

    // Ciclo 2: find relevant chunks
    const chunks = await this.cvRepository.findRelevantChunks(userId, vector, 6, 0.65)
    if (chunks.length === 0) throw new NoCvUploadedForSpeechError()

    const topSimilarity = Math.max(...chunks.map((c) => c.similarity))

    // Ciclo 3: build prompts
    const systemPrompt = SPEECH_SYSTEM_PROMPT
    const userPrompt = buildSpeechUserPrompt(chunks, company, jobOffer)

    // Ciclo 4, 5 & 6: call LLM, parse, retry once on failure
    const { speech } = await this.callLlmWithRetry(systemPrompt, userPrompt, company)

    // Ciclo 7: persist
    const { id: generationId } = await this.generationRepository.saveSpeech({
      userId,
      speechData: speech,
      company,
      generatedCvId,
      idempotencyKey,
    })

    return { speech, generationId, chunksUsed: chunks.length, topSimilarity }
  }

  private async callLlmWithRetry(
    systemPrompt: string,
    userPrompt: string,
    company: CompanySnapshot,
  ): Promise<{ speech: Speech }> {
    const first = await this.llmProvider.complete({ systemPrompt, userPrompt })
    const firstParsed = this.tryParse(first.text, company)

    if (firstParsed.success) return { speech: firstParsed.data }

    const retryPrompt = buildSpeechRetryUserPrompt(`Error de validación: ${firstParsed.error}`)
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
