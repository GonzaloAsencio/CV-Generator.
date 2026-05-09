import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { SupabaseCvRepository } from '@/lib/adapters/supabase-cv-repository'
import { UnpdfExtractor } from '@/lib/adapters/unpdf-extractor'
import { GeminiEmbeddingProvider } from '@/lib/adapters/gemini-embeddings'
import { GeminiLlmProvider } from '@/lib/adapters/gemini-llm'
import { UpstashRateLimiter } from '@/lib/adapters/upstash-rate-limiter'
import { MemoryRateLimiter } from '@/lib/adapters/memory-rate-limiter'
import { SupabaseLlmCallLogger } from '@/lib/adapters/supabase-llm-call-logger'
import { UploadCvUseCase } from '@/lib/use-cases/upload-cv'
import { GenerateTailoredCvUseCase } from '@/lib/use-cases/generate-tailored-cv'
import type { CvRepository } from '@/lib/ports/cv-repository'
import type { RateLimiter } from '@/lib/ports/rate-limiter'

function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
}

export function createCvRepository(): CvRepository {
  return new SupabaseCvRepository(createSupabaseServiceClient())
}

export function createRateLimiter(): RateLimiter {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRateLimiter(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
    )
  }
  return new MemoryRateLimiter()
}

export function createUploadCvUseCase(): UploadCvUseCase {
  return new UploadCvUseCase(
    new UnpdfExtractor(),
    new GeminiEmbeddingProvider(process.env.GOOGLE_API_KEY!),
    createCvRepository(),
  )
}

export function createGenerateTailoredCvUseCase(): GenerateTailoredCvUseCase {
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
  return new GenerateTailoredCvUseCase(
    new GeminiEmbeddingProvider(process.env.GOOGLE_API_KEY!),
    createCvRepository(),
    new GeminiLlmProvider(process.env.GOOGLE_API_KEY!),
    // GenerationRepository — placeholder until HU-10 adds SupabaseGenerationRepository
    {
      saveCv: async () => { throw new Error('GenerationRepository not yet wired') },
      saveSpeech: async () => { throw new Error('GenerationRepository not yet wired') },
      findCvByIdempotencyKey: async () => null,
      findSpeechByIdempotencyKey: async () => null,
    },
    new SupabaseLlmCallLogger(serviceClient),
  )
}
