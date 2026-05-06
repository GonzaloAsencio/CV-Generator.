import type { SupabaseClient } from '@supabase/supabase-js'
import type { CvChunk, CvRepository, RelevantChunk } from '@/lib/ports/cv-repository'

export class SupabaseCvRepository implements CvRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveChunks(userId: string, chunks: CvChunk[]): Promise<void> {
    const rows = chunks.map((c) => ({
      user_id: userId,
      content: c.content,
      embedding: `[${c.embedding.join(',')}]`,
      chunk_index: c.chunkIndex,
    }))

    const { error } = await this.client.from('cv_chunks').insert(rows)
    if (error) throw new Error(`saveChunks failed: ${error.message}`)
  }

  async findRelevantChunks(
    userId: string,
    embedding: number[],
    top: number,
    threshold: number,
  ): Promise<RelevantChunk[]> {
    const { data, error } = await this.client.rpc('match_cv_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: threshold,
      match_count: top,
      p_user_id: userId,
    })

    if (error) throw new Error(`findRelevantChunks failed: ${error.message}`)
    return (data as RelevantChunk[]) ?? []
  }

  async deleteForUser(userId: string): Promise<void> {
    const { error } = await this.client
      .from('cv_chunks')
      .delete()
      .eq('user_id', userId)

    if (error) throw new Error(`deleteForUser failed: ${error.message}`)
  }
}
