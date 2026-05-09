import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseGenerationRepository } from './supabase-generation-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SaveCvOptions, SaveSpeechOptions } from '@/lib/ports/generation-repository'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { Speech } from '@/lib/schemas/speech.schema'

// ─── fixtures ────────────────────────────────────────────────────────────────

const MOCK_CV: HarvardCv = {
  personal: { name: 'Ana García', email: 'ana@example.com', phone: '+54111', location: 'BA' },
  title: 'Developer',
  summary: 'Great dev',
  experience: [],
  education: [],
  skills: { technical: [], soft: [] },
  languages: [],
}

const MOCK_SPEECH: Speech = {
  full_text: 'Hola. Soy desarrolladora. Gracias.',
  sections: {
    introduction: 'Hola',
    motivation: 'Me apasiona el desarrollo',
    technical_skills: 'React y Node.js',
    value_proposition: 'Aportaré mucho valor',
  },
  word_count: 380,
  estimated_duration_minutes: 3,
}

const COMPANY = { name: 'Acme', industry: 'Tech' }

const SAVE_CV_OPTS: SaveCvOptions = {
  userId: 'user-1',
  cvData: MOCK_CV,
  company: COMPANY,
  jobOfferSnippet: 'Senior React dev',
  chunksUsed: 3,
  topSimilarity: 0.91,
  idempotencyKey: 'idem-abc',
}

const SAVE_SPEECH_OPTS: SaveSpeechOptions = {
  userId: 'user-1',
  speechData: MOCK_SPEECH,
  company: COMPANY,
  generatedCvId: 'cv-uuid',
  idempotencyKey: 'idem-speech-1',
}

// ─── mock builder ─────────────────────────────────────────────────────────────

interface SupabaseMock {
  client: SupabaseClient
  mockFrom: ReturnType<typeof vi.fn>
  mockInsert: ReturnType<typeof vi.fn>
  mockSingle: ReturnType<typeof vi.fn>
}

function buildSupabaseMock(defaultResult = { data: { id: 'gen-001' }, error: null }): SupabaseMock {
  const mockSingle = vi.fn().mockResolvedValue(defaultResult)
  const mockEq = vi.fn()
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq, single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert, select: mockSelect, eq: mockEq })

  return {
    client: { from: mockFrom } as unknown as SupabaseClient,
    mockFrom,
    mockInsert,
    mockSingle,
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('SupabaseGenerationRepository', () => {
  let mocks: SupabaseMock
  let repo: SupabaseGenerationRepository

  beforeEach(() => {
    mocks = buildSupabaseMock()
    repo = new SupabaseGenerationRepository(mocks.client)
  })

  // ── saveCv ────────────────────────────────────────────────────────────────

  it('should insert into generated_cvs and return the id', async () => {
    const result = await repo.saveCv(SAVE_CV_OPTS)
    expect(result).toEqual({ id: 'gen-001' })
    expect(mocks.mockFrom).toHaveBeenCalledWith('generated_cvs')
  })

  it('should include idempotency_key in the insert payload', async () => {
    await repo.saveCv(SAVE_CV_OPTS)
    const insertCall = mocks.mockInsert.mock.calls[0][0]
    expect(insertCall).toMatchObject({ idempotency_key: 'idem-abc' })
  })

  it('should set idempotency_key to null when not provided', async () => {
    const optsNoKey = { ...SAVE_CV_OPTS, idempotencyKey: undefined }
    await repo.saveCv(optsNoKey)
    const insertCall = mocks.mockInsert.mock.calls[0][0]
    expect(insertCall.idempotency_key).toBeNull()
  })

  it('should throw when Supabase returns an error on saveCv', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
    await expect(repo.saveCv(SAVE_CV_OPTS)).rejects.toThrow('DB error')
  })

  // ── saveSpeech ────────────────────────────────────────────────────────────

  it('should insert into generated_speeches and return the id', async () => {
    const result = await repo.saveSpeech(SAVE_SPEECH_OPTS)
    expect(result).toEqual({ id: 'gen-001' })
    expect(mocks.mockFrom).toHaveBeenCalledWith('generated_speeches')
  })

  it('should include generated_cv_id in the speech insert payload', async () => {
    await repo.saveSpeech(SAVE_SPEECH_OPTS)
    const insertCall = mocks.mockInsert.mock.calls[0][0]
    expect(insertCall.generated_cv_id).toBe('cv-uuid')
  })

  it('should throw when Supabase returns an error on saveSpeech', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB speech error' } })
    await expect(repo.saveSpeech(SAVE_SPEECH_OPTS)).rejects.toThrow('DB speech error')
  })

  // ── findCvByIdempotencyKey ────────────────────────────────────────────────

  it('should return null when no CV matches the idempotency key', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const result = await repo.findCvByIdempotencyKey('user-1', 'missing-key')
    expect(result).toBeNull()
  })

  it('should return the CV data when idempotency key matches', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'found-id', cv_data: MOCK_CV }, error: null })
    const result = await repo.findCvByIdempotencyKey('user-1', 'idem-abc')
    expect(result).toEqual({ id: 'found-id', cvData: MOCK_CV })
  })

  // ── findSpeechByIdempotencyKey ────────────────────────────────────────────

  it('should return null when no speech matches the idempotency key', async () => {
    mocks.mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const result = await repo.findSpeechByIdempotencyKey('user-1', 'missing-key')
    expect(result).toBeNull()
  })

  it('should return the speech data when idempotency key matches', async () => {
    mocks.mockSingle.mockResolvedValueOnce({
      data: { id: 'speech-found', speech_data: MOCK_SPEECH },
      error: null,
    })
    const result = await repo.findSpeechByIdempotencyKey('user-1', 'idem-speech-1')
    expect(result).toEqual({ id: 'speech-found', speechData: MOCK_SPEECH })
  })
})
