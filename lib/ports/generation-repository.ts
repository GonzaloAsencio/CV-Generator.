import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { Speech } from '@/lib/schemas/speech.schema'

export interface CompanySnapshot {
  name: string
  industry?: string
  techStack?: string[]
  culture?: string
  notes?: string
}

export interface SaveCvOptions {
  userId: string
  cvData: HarvardCv
  company: CompanySnapshot
  jobOfferSnippet: string
  chunksUsed: number
  topSimilarity: number
  idempotencyKey?: string
}

export interface SaveSpeechOptions {
  userId: string
  speechData: Speech
  company: CompanySnapshot
  generatedCvId?: string
  idempotencyKey?: string
}

export interface GenerationRepository {
  saveCv(opts: SaveCvOptions): Promise<{ id: string }>
  saveSpeech(opts: SaveSpeechOptions): Promise<{ id: string }>
  findCvByIdempotencyKey(userId: string, key: string): Promise<{ id: string; cvData: HarvardCv } | null>
  findSpeechByIdempotencyKey(userId: string, key: string): Promise<{ id: string; speechData: Speech } | null>
}
