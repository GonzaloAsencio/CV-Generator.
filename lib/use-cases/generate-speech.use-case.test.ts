import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GenerateSpeechUseCase, LlmInvalidSpeechOutputError } from './generate-speech.use-case'
import {
  createTestLlmProvider,
  createTestGenerationRepository,
} from '@/lib/composition/test-container'
import type { Speech } from '@/lib/schemas/speech.schema'
import type { CompanySnapshot } from '@/lib/ports/generation-repository'

// ─── fixtures ────────────────────────────────────────────────────────────────

const VALID_SPEECH: Speech = {
  full_text:
    'Me llamo Ana García. Estoy muy interesada en unirme a TechCo como desarrolladora React y TypeScript. ' +
    'Tengo 5 años de experiencia construyendo aplicaciones web escalables con Node.js. ' +
    'Lideré equipos de 4 personas y reduje la latencia en 30%. ' +
    'Creo que puedo aportar gran valor al equipo de TechCo combinando mis habilidades técnicas y de liderazgo.',
  sections: {
    introduction: 'Me llamo Ana García, desarrolladora Full Stack con 5 años de experiencia.',
    motivation: 'Quiero unirme a TechCo porque es referente en el sector.',
    technical_skills: 'Domino React, TypeScript y Node.js, con experiencia en sistemas de alta disponibilidad.',
    value_proposition: 'Aportaré mi experiencia en liderazgo y mi enfoque en métricas de performance.',
  },
  word_count: 400,
  estimated_duration_minutes: 2.5,
}

const COMPANY: CompanySnapshot = {
  name: 'TechCo',
  techStack: ['React', 'TypeScript'],
}

const JOB_OFFER = 'Buscamos un desarrollador React con 5+ años de experiencia y TypeScript.'
const CV_TEXT = 'Experiencia en React y TypeScript. Lideré equipo de 4 personas.'

// ─── setup ───────────────────────────────────────────────────────────────────

describe('GenerateSpeechUseCase', () => {
  let llmProvider: ReturnType<typeof createTestLlmProvider>
  let generationRepository: ReturnType<typeof createTestGenerationRepository>
  let useCase: GenerateSpeechUseCase

  beforeEach(() => {
    llmProvider = createTestLlmProvider()
    generationRepository = createTestGenerationRepository()
    useCase = new GenerateSpeechUseCase(llmProvider, generationRepository)

    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: JSON.stringify(VALID_SPEECH),
      latencyMs: 500,
    })
    vi.mocked(generationRepository.saveSpeech).mockResolvedValue({ id: 'speech-001' })
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

  it('should return the parsed Speech on successful LLM response', async () => {
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should return correct metadata', async () => {
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.generationId).toBe('speech-001')
    expect(result.chunksUsed).toBe(0)
    expect(result.topSimilarity).toBe(1)
  })

  it('should strip markdown code fences from LLM response', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: '```json\n' + JSON.stringify(VALID_SPEECH) + '\n```',
      latencyMs: 500,
    })
    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  // ── Retry logic ───────────────────────────────────────────────────────────

  it('should retry once when LLM returns invalid JSON', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: 'not valid json', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should include the validation error in the retry prompt', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: '{"bad": "schema"}', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    const retryCall = vi.mocked(llmProvider.complete).mock.calls[1][0]
    expect(retryCall.userPrompt).toContain('Error de validación')
  })

  it('should throw LlmInvalidSpeechOutputError when both attempts return invalid JSON', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: 'still not valid',
      latencyMs: 400,
    })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)
  })

  it('should call the LLM exactly twice before throwing on double failure', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({ text: '{}', latencyMs: 400 })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
  })

  // ── Persistence ───────────────────────────────────────────────────────────

  it('should save the speech with the company snapshot', async () => {
    await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })
    expect(generationRepository.saveSpeech).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        speechData: VALID_SPEECH,
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
    expect(generationRepository.saveSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'idem-key-abc' }),
    )
  })

  it('should pass generatedCvId to the repository when provided', async () => {
    await useCase.execute({
      userId: 'u1',
      cvText: CV_TEXT,
      jobOffer: JOB_OFFER,
      company: COMPANY,
      generatedCvId: 'cv-999',
    })
    expect(generationRepository.saveSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ generatedCvId: 'cv-999' }),
    )
  })

  it('should not call saveSpeech when the LLM fails twice', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({ text: 'bad', latencyMs: 400 })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)

    expect(generationRepository.saveSpeech).not.toHaveBeenCalled()
  })

  // ── Post-parse validation: company name + tech stack ──────────────────────

  it('should retry when speech full_text does not mention company name', async () => {
    const speechWithoutCompany: Speech = {
      ...VALID_SPEECH,
      full_text: 'Me llamo Ana. Tengo experiencia en React y TypeScript. Aportaré valor al equipo.',
    }

    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: JSON.stringify(speechWithoutCompany), latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should throw LlmInvalidSpeechOutputError when neither attempt mentions company name', async () => {
    const speechWithoutCompany: Speech = {
      ...VALID_SPEECH,
      full_text: 'Me llamo Ana. Tengo experiencia en React y TypeScript. Aportaré valor.',
    }

    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: JSON.stringify(speechWithoutCompany),
      latencyMs: 400,
    })

    await expect(
      useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
  })

  it('should retry when speech full_text does not mention any tech stack item', async () => {
    const speechWithoutTech: Speech = {
      ...VALID_SPEECH,
      full_text: 'Me llamo Ana. Quiero unirme a TechCo. Tengo mucha experiencia en desarrollo.',
    }

    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: JSON.stringify(speechWithoutTech), latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: COMPANY })

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should pass validation when company has no techStack defined', async () => {
    const companyNoStack: CompanySnapshot = { name: 'TechCo' }
    const speechNoTech: Speech = {
      ...VALID_SPEECH,
      full_text: 'Me llamo Ana. Quiero unirme a TechCo. Tengo mucha experiencia en desarrollo.',
    }

    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: JSON.stringify(speechNoTech),
      latencyMs: 400,
    })

    const result = await useCase.execute({ userId: 'u1', cvText: CV_TEXT, jobOffer: JOB_OFFER, company: companyNoStack })
    expect(result.speech).toEqual(speechNoTech)
    expect(llmProvider.complete).toHaveBeenCalledTimes(1)
  })
})
