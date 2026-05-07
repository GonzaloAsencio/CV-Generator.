import { createClient } from '@supabase/supabase-js'
import { SupabaseCvRepository } from '@/lib/adapters/supabase-cv-repository'
import type { CvRepository } from '@/lib/ports/cv-repository'

// Sprint 2 will add: GeminiLlmProvider, GeminiEmbeddingProvider,
// SupabaseGenerationRepository, UnpdfExtractor, UpstashRateLimiter

export function createCvRepository(): CvRepository {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
  return new SupabaseCvRepository(client)
}
