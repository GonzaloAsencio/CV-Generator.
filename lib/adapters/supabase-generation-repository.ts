import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GenerationRepository,
  SaveCvOptions,
  SaveSpeechOptions,
} from '@/lib/ports/generation-repository'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import type { Speech } from '@/lib/schemas/speech.schema'

export class SupabaseGenerationRepository implements GenerationRepository {
  constructor(private client: SupabaseClient) {}

  async saveCv(opts: SaveCvOptions): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from('generated_cvs')
      .insert({
        user_id: opts.userId,
        company_snapshot: opts.company,
        job_offer_snippet: opts.jobOfferSnippet,
        cv_data: opts.cvData,
        chunks_used: opts.chunksUsed,
        top_similarity: opts.topSimilarity,
        idempotency_key: opts.idempotencyKey ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: (data as { id: string }).id }
  }

  async saveSpeech(opts: SaveSpeechOptions): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from('generated_speeches')
      .insert({
        user_id: opts.userId,
        company_snapshot: opts.company,
        generated_cv_id: opts.generatedCvId ?? null,
        speech_data: opts.speechData,
        idempotency_key: opts.idempotencyKey ?? null,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: (data as { id: string }).id }
  }

  async findCvByIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<{ id: string; cvData: HarvardCv } | null> {
    const { data } = await this.client
      .from('generated_cvs')
      .select('id, cv_data')
      .eq('user_id', userId)
      .eq('idempotency_key', key)
      .single()
    if (!data) return null
    const row = data as { id: string; cv_data: HarvardCv }
    return { id: row.id, cvData: row.cv_data }
  }

  async findSpeechByIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<{ id: string; speechData: Speech } | null> {
    const { data } = await this.client
      .from('generated_speeches')
      .select('id, speech_data')
      .eq('user_id', userId)
      .eq('idempotency_key', key)
      .single()
    if (!data) return null
    const row = data as { id: string; speech_data: Speech }
    return { id: row.id, speechData: row.speech_data }
  }
}
