import { createClient } from '@supabase/supabase-js'
import { SupabaseCvRepository } from '@/lib/adapters/supabase-cv-repository'
import { UnpdfExtractor } from '@/lib/adapters/unpdf-extractor'
import { GeminiEmbeddingProvider } from '@/lib/adapters/gemini-embeddings'
import { UploadCvUseCase } from '@/lib/use-cases/upload-cv'
import type { CvRepository } from '@/lib/ports/cv-repository'

function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
}

export function createCvRepository(): CvRepository {
  return new SupabaseCvRepository(createSupabaseServiceClient())
}

export function createUploadCvUseCase(): UploadCvUseCase {
  return new UploadCvUseCase(
    new UnpdfExtractor(),
    new GeminiEmbeddingProvider(process.env.GOOGLE_API_KEY!),
    createCvRepository(),
  )
}
