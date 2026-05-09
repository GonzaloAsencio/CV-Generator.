import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GenerateSpeechUseCase, LlmInvalidSpeechOutputError, NoCvUploadedForSpeechError } from './generate-speech.use-case'
import {
  createTestEmbeddingProvider,
  createTestCvRepository,
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

const MOCK_CHUNKS = [
  { id: '1', content: 'Experiencia en React y TypeScript', similarity: 0.92 },
  { id: '2', content: 'Lideré equipo de 4 personas', similarity: 0.85 },
]

const MOCK_VECTOR = Array(768).fill(0.1)

// ─── setup ───────────────────────────────────────────────────────────────────

describe('GenerateSpeechUseCase', () => {
  let embeddingProvider: ReturnType<typeof createTestEmbeddingProvider>
  let cvRepository: ReturnType<typeof createTestCvRepository>
  let llmProvider: ReturnType<typeof createTestLlmProvider>
  let generationRepository: ReturnType<typeof createTestGenerationRepository>
  let useCase: GenerateSpeechUseCase

  beforeEach(() => {
    embeddingProvider = createTestEmbeddingProvider()
    cvRepository = createTestCvRepository()
    llmProvider = createTestLlmProvider()
    generationRepository = createTestGenerationRepository()
    useCase = new GenerateSpeechUseCase(
      embeddingProvider,
      cvRepository,
      llmProvider,
      generationRepository,
    )

    // Happy-path defaults
    vi.mocked(embeddingProvider.embed).mockResolvedValue(MOCK_VECTOR)
    vi.mocked(cvRepository.findRelevantChunks).mockResolvedValue(MOCK_CHUNKS)
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: JSON.stringify(VALID_SPEECH),
      latencyMs: 500,
    })
    vi.mocked(generationRepository.saveSpeech).mockResolvedValue({ id: 'speech-001' })
  })

  // ── Ciclo 1: embed jobOffer ───────────────────────────────────────────────

  it('should embed the jobOffer text', async () => {
    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    expect(embeddingProvider.embed).toHaveBeenCalledWith(JOB_OFFER)
  })

  // ── Ciclo 2: find relevant chunks ─────────────────────────────────────────

  it('should search for relevant chunks using the embedded vector', async () => {
    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    expect(cvRepository.findRelevantChunks).toHaveBeenCalledWith('u1', MOCK_VECTOR, 6, 0.65)
  })

  it('should throw NoCvUploadedForSpeechError when no chunks are found', async () => {
    vi.mocked(cvRepository.findRelevantChunks).mockResolvedValue([])
    await expect(
      useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(NoCvUploadedForSpeechError)
  })

  // ── Ciclo 3: build speech prompt ──────────────────────────────────────────

  it('should call the LLM with a system prompt and a user prompt containing company name', async () => {
    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    const [opts] = vi.mocked(llmProvider.complete).mock.calls[0]
    expect(opts.systemPrompt).toBeTruthy()
    expect(opts.userPrompt).toContain('TechCo')
    expect(opts.userPrompt).toContain(JOB_OFFER)
  })

  it('should include chunk contents in the LLM prompt', async () => {
    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    const [opts] = vi.mocked(llmProvider.complete).mock.calls[0]
    expect(opts.userPrompt).toContain('Experiencia en React y TypeScript')
  })

  // ── Ciclo 4: call LLM and parse SpeechSchema ──────────────────────────────

  it('should return the parsed Speech on successful LLM response', async () => {
    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should return correct metadata', async () => {
    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.generationId).toBe('speech-001')
    expect(result.chunksUsed).toBe(2)
    expect(result.topSimilarity).toBeCloseTo(0.92)
  })

  it('should strip markdown code fences from LLM response', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: '```json\n' + JSON.stringify(VALID_SPEECH) + '\n```',
      latencyMs: 500,
    })
    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  // ── Ciclo 5: invalid JSON → retries once ─────────────────────────────────

  it('should retry once when LLM returns invalid JSON', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: 'not valid json', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
    expect(result.speech).toEqual(VALID_SPEECH)
  })

  it('should include the validation error in the retry prompt', async () => {
    vi.mocked(llmProvider.complete)
      .mockResolvedValueOnce({ text: '{"bad": "schema"}', latencyMs: 400 })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_SPEECH), latencyMs: 400 })

    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })

    const retryCall = vi.mocked(llmProvider.complete).mock.calls[1][0]
    expect(retryCall.userPrompt).toContain('Error de validación')
  })

  // ── Ciclo 6: retry fails → throw LlmInvalidSpeechOutputError ─────────────

  it('should throw LlmInvalidSpeechOutputError when both attempts return invalid JSON', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({
      text: 'still not valid',
      latencyMs: 400,
    })

    await expect(
      useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)
  })

  it('should call the LLM exactly twice before throwing on double failure', async () => {
    vi.mocked(llmProvider.complete).mockResolvedValue({ text: '{}', latencyMs: 400 })

    await expect(
      useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY }),
    ).rejects.toThrow(LlmInvalidSpeechOutputError)

    expect(llmProvider.complete).toHaveBeenCalledTimes(2)
  })

  // ── Ciclo 7: persist with saveSpeech ──────────────────────────────────────

  it('should save the speech with the company snapshot', async () => {
    await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })
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
      useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY }),
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

    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })

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
      useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY }),
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

    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: COMPANY })

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

    const result = await useCase.execute({ userId: 'u1', jobOffer: JOB_OFFER, company: companyNoStack })
    expect(result.speech).toEqual(speechNoTech)
    expect(llmProvider.complete).toHaveBeenCalledTimes(1)
  })
})
