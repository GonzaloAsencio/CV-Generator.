import { HarvardCvSchema, type HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { LlmProvider } from '@/lib/ports/llm-provider'
import type { GenerationRepository, CompanySnapshot } from '@/lib/ports/generation-repository'
import type { LlmCallLogger } from '@/lib/ports/llm-call-logger'
import { noopLlmCallLogger } from '@/lib/ports/llm-call-logger'
import {
  CV_SYSTEM_PROMPT,
  buildHarvardUserPrompt,
  buildStructuredUserPrompt,
  buildRetryUserPrompt,
  extractJsonFromLlmText,
} from '@/lib/utils/prompt-builder'
import type { ParsedPersonalInfo } from '@/lib/utils/cv-parser'
import type { ProfileData } from '@/lib/schemas/profile-data.schema'

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
  cvText: string
  jobOffer: string
  company: CompanySnapshot
  idempotencyKey?: string
  personalInfo?: Partial<ParsedPersonalInfo>
  profileData?: ProfileData
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
    private readonly llmProvider: LlmProvider,
    private readonly generationRepository: GenerationRepository,
    private readonly logger: LlmCallLogger = noopLlmCallLogger,
  ) {}

  async execute(input: GenerateTailoredCvInput): Promise<GenerateTailoredCvOutput> {
    const { userId, cvText, jobOffer, company, idempotencyKey, personalInfo, profileData } = input

    const useStructured = !!profileData && profileData.experience.length > 0

    const systemPrompt = CV_SYSTEM_PROMPT
    const userPrompt = useStructured
      ? buildStructuredUserPrompt(profileData, company, jobOffer, personalInfo)
      : buildHarvardUserPrompt(cvText, company, jobOffer, personalInfo)

    const { cv, retryCount, latencyMs } = await this.callLlmWithRetry(systemPrompt, userPrompt, userId)

    // Overlay personal fields (from DB profile — not regex)
    if (personalInfo) {
      if (personalInfo.name)     cv.personal.name     = personalInfo.name
      if (personalInfo.email)    cv.personal.email    = personalInfo.email
      if (personalInfo.phone)    cv.personal.phone    = personalInfo.phone
      if (personalInfo.location) cv.personal.location = personalInfo.location
      if (personalInfo.linkedin !== undefined) cv.personal.linkedin = personalInfo.linkedin
      if (personalInfo.github   !== undefined) cv.personal.github   = personalInfo.github
    }

    // Overlay all structured profile data — guarantees no hallucination
    if (useStructured && profileData) {
      cv.experience = profileData.experience.map((entry, i) => ({
        title:      entry.title,
        company:    entry.company,
        location:   entry.location,
        period:     entry.period,
        highlights: (cv.experience[i]?.highlights ?? entry.highlights)
          .map(h => h.trim()).filter(h => h.length > 0).slice(0, 5),
      })).map(e => ({ ...e, highlights: e.highlights.length > 0 ? e.highlights : ['Ver CV completo'] }))

      cv.education = profileData.education.map(e => ({
        degree:      e.degree,
        institution: e.institution,
        location:    e.location,
        year:        e.year,
        ...(e.honors ? { honors: e.honors } : {}),
      }))

      if (profileData.skills.technical.length > 0 || profileData.skills.soft.length > 0) {
        cv.skills = {
          technical: profileData.skills.technical,
          soft:      profileData.skills.soft,
        }
      }

      if (profileData.languages.length > 0) {
        cv.languages = profileData.languages.map(l => ({ language: l.language, level: l.level }))
      }

      if (profileData.certifications.length > 0) {
        cv.certifications = profileData.certifications
      }
    }

    void this.logger.log({
      userId,
      kind: 'cv',
      prompt: userPrompt,
      response: null,
      parsedOk: true,
      retryCount,
      latencyMs,
    })

    const { id: generationId } = await this.generationRepository.saveCv({
      userId,
      cvData: cv,
      company,
      jobOfferSnippet: jobOffer.slice(0, 500),
      chunksUsed: 0,
      topSimilarity: 1,
      idempotencyKey,
    })

    return { cv, generationId, chunksUsed: 0, topSimilarity: 1 }
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

    const errorDetail = firstParsed.error
    const retryPrompt = buildRetryUserPrompt(userPrompt, first.text, `Error de validación: ${errorDetail}`)
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
