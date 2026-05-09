import { HarvardCvSchema, type HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { EmbeddingProvider } from '@/lib/ports/embedding-provider'
import type { CvRepository } from '@/lib/ports/cv-repository'
import type { LlmProvider } from '@/lib/ports/llm-provider'
import type { GenerationRepository, CompanySnapshot } from '@/lib/ports/generation-repository'
import type { LlmCallLogger } from '@/lib/ports/llm-call-logger'
import { noopLlmCallLogger } from '@/lib/ports/llm-call-logger'
import {
  CV_SYSTEM_PROMPT,
  buildHarvardUserPrompt,
  buildRetryUserPrompt,
  extractJsonFromLlmText,
} from '@/lib/utils/prompt-builder'

// ─── errors ──────────────────────────────────────────────────────────────────

export class NoCvUploadedError extends Error {
  constructor() {
    super('No CV uploaded for this user')
    this.name = 'NoCvUploadedError'
  }
}

export class LlmInvalidOutputError extends Error {
  constructor(public readonly validationDetail: string) {
    super(`LLM returned invalid JSON after retry: ${validationDetail}`)
    this.name = 'LlmInvalidOutputError'
  }
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface GenerateTailoredCvInput {
  userId: string
  jobOffer: string
  company: CompanySnapshot
  idempotencyKey?: string
}

export interface GenerateTailoredCvOutput {
  cv: HarvardCv
  generationId: string
  chunksUsed: number
  topSimilarity: number
}

// ─── use case ────────────────────────────────────────────────────────────────

export class GenerateTailoredCvUseCase {
  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly cvRepository: CvRepository,
    private readonly llmProvider: LlmProvider,
    private readonly generationRepository: GenerationRepository,
    private readonly logger: LlmCallLogger = noopLlmCallLogger,
  ) {}

  async execute(input: GenerateTailoredCvInput): Promise<GenerateTailoredCvOutput> {
    const { userId, jobOffer, company, idempotencyKey } = input

    // Ciclo 1: embed job offer
    const vector = await this.embeddingProvider.embed(jobOffer)

    // Ciclo 2: find relevant chunks
    const chunks = await this.cvRepository.findRelevantChunks(userId, vector, 6, 0.65)
    if (chunks.length === 0) throw new NoCvUploadedError()

    const topSimilarity = Math.max(...chunks.map((c) => c.similarity))

    // Ciclo 3: build prompts
    const systemPrompt = CV_SYSTEM_PROMPT
    const userPrompt = buildHarvardUserPrompt(chunks, company, jobOffer)

    // Ciclo 4 & 5 & 6: call LLM, parse, retry once on failure
    const { cv, retryCount, latencyMs } = await this.callLlmWithRetry(
      systemPrompt,
      userPrompt,
      userId,
    )

    void this.logger.log({
      userId,
      kind: 'cv',
      prompt: userPrompt,
      response: null,
      parsedOk: true,
      retryCount,
      latencyMs,
    })

    // Ciclo 7: persist
    const { id: generationId } = await this.generationRepository.saveCv({
      userId,
      cvData: cv,
      company,
      jobOfferSnippet: jobOffer.slice(0, 500),
      chunksUsed: chunks.length,
      topSimilarity,
      idempotencyKey,
    })

    return { cv, generationId, chunksUsed: chunks.length, topSimilarity }
  }

  private async callLlmWithRetry(
    systemPrompt: string,
    userPrompt: string,
    userId: string,
  ): Promise<{ cv: HarvardCv; retryCount: number; latencyMs: number }> {
    const first = await this.llmProvider.complete({ systemPrompt, userPrompt })
    const firstParsed = this.tryParse(first.text)

    if (firstParsed.success) {
      return { cv: firstParsed.data, retryCount: 0, latencyMs: first.latencyMs }
    }

    // Retry once with the validation error embedded
    const errorDetail = firstParsed.error
    const retryPrompt = buildRetryUserPrompt(`Error de validación: ${errorDetail}`)
    const second = await this.llmProvider.complete({ systemPrompt, userPrompt: retryPrompt })
    const secondParsed = this.tryParse(second.text)

    if (secondParsed.success) {
      return { cv: secondParsed.data, retryCount: 1, latencyMs: first.latencyMs + second.latencyMs }
    }

    void this.logger.log({
      userId,
      kind: 'cv',
      prompt: userPrompt,
      response: second.text,
      parsedOk: false,
      retryCount: 1,
      latencyMs: first.latencyMs + second.latencyMs,
      error: secondParsed.error,
    })

    throw new LlmInvalidOutputError(secondParsed.error)
  }

  private tryParse(text: string):
    | { success: true; data: HarvardCv }
    | { success: false; error: string } {
    try {
      const json = extractJsonFromLlmText(text)
      const result = HarvardCvSchema.safeParse(json)
      if (result.success) return { success: true, data: result.data }
      return { success: false, error: JSON.stringify(result.error.issues) }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
}
