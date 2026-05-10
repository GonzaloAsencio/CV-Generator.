import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GenerateTailoredCvUseCase, LlmInvalidOutputError } from './generate-tailored-cv'
import {
  createTestLlmProvider,
  createTestGenerationRepository,
} from '@/lib/composition/test-container'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

// ─── fixtures ────────────────────────────────────────────────────────────────

const VALID_CV: HarvardCv = {
  personal: {
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '+54111234567',
    location: 'Buenos Aires',
  },
  title: 'Desarrolladora Full Stack',
  summary: 'Desarrolladora con 5 años de experiencia en React y Node.js.',
  experience: [
    {
      title: 'Senior Developer',
      company: 'Acme',
      location: 'Buenos Aires',
      period: '2020-2025',
      highlights: ['Desarrollé la plataforma core', 'Reduje latencia en 30%'],
    },
  ],
  education: [
    { degree: 'Lic. en Sistemas', institution: 'UBA', location: 'Buenos Aires', year: '2018' },
  ],
  skills: { technical: ['React', 'Node.js'], soft: ['Trabajo en equipo'] },
  languages: [{ language: 'Español', level: 'Nativo' }],
}

const COMPANY: CompanySnapshot = {
  name: 'TechCo',
  techStack: ['React', 'TypeScript'],
}

const JOB_OFFER = 'We are looking for a Senior React Developer with 5+ years of experience.'
const CV_TEXT = 'Experiencia en React y TypeScript. Lideré equipo de 4 personas.'

// ─── setup ───────────────────────────────────────────────────────────────────

describe('GenerateTailoredCvUseCase', () => {
  let llmProvider: ReturnType<typeof createTestLlmProvider>
  let generationRepository: ReturnType<typeof createTestGenerationRepository>
  let useCase: GenerateTailoredCvUseCase

  beforeEach(() => {
    llmProvider = createTestLlmProvider()
    generationRepository = createTestGenerationRepository()
    useCase = new GenerateTailoredCvUseCase(llmProvider, generationRepository)

    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: JSON.stringify(VALID_CV),
      latencyMs: 500,
    })
    vi.mocked(generationRepository.saveCv).mockResolvedValue({ id: 'gen-001' })
  })

  // ── Prompt building ───────────────────────────────────────────────────────

  it('should call the LLM with a system prompt and a user prompt containing company name', async () => {
    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    const [opts] = vi.mocked(llmProvider.complete).mock.calls[0]
    expect(opts.systemPrompt).toBeTruthy()
    expect(opts.userPrompt).toContain('TechCo')
    expect(opts.userPrompt).toContain(JOB_OFFER)
  })

  it('should include the CV text in the LLM prompt', async () => {
    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    const [opts] = vi.mocked(llmProvider.complete).mock.calls[0]
    expect(opts.userPrompt).toContain(CV_TEXT)
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it('should return the parsed Harvard CV on successful LLM response', async () => {
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.cv).toEqual(VALID_CV)
  })

  it('should return correct metadata', async () => {
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.generationId).toBe('gen-001')
    expect(result.chunksUsed).toBe(0)
    expect(result.topSimilarity).toBe(1)
  })

  it('should strip markdown code fences from LLM response', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: '```json\n' + JSON.stringify(VALID_CV) + '\n```',
      latencyMs: 500,
    })
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.cv).toEqual(VALID_CV)
  })

  // ── Retry logic ───────────────────────────────────────────────────────────

  it('should retry once when LLM returns invalid JSON', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: 'not valid json', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_CV), latencyMs: 400 })

    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
    expect(result.cv).toEqual(VALID_CV)
  })

  it('should include the validation error in the retry prompt', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: '{"bad": "schema"}', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_CV), latencyMs: 400 })

    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    const retryCall = vi.mocked(llmProvider.complete).mock.calls[1][0]
    expect(retryCall.userPrompt).toContain('Error de validación')
  })

  it('should throw LlmInvalidOutputError when both attempts return invalid JSON', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: 'still not valid',
      latencyMs: 400,
    })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidOutputError)
  })

  it('should call the LLM exactly twice before throwing on double failure', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({ text: '{}', latencyMs: 400 })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidOutputError)

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
  })

  // ── Persistence ───────────────────────────────────────────────────────────

  it('should save the CV with the company snapshot', async () => {
    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(generationRepository.saveCv).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        cvData: VALID_CV,
        company: COMPANY,
      }),
    )
  })

  it('should pass the idempotency key to the repository when provided', async () => {
    await useCase.execute({
      userId: 'u1',
      cvText: CV_TEXT,
      jobOffer: JOB_OFFER,
      company: COMPANY,
      idempotencyKey: 'idem-key-abc',
    })
    expect(generationRepository.saveCv).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'idem-key-abc' }),
    )
  })

  it('should not call saveCv when the LLM fails twice', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({ text: 'bad', latencyMs: 400 })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidOutputError)

    expect(generationRepository.saveCv).not.toHaveBeenCalled()
  })
})
