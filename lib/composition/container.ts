import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { SupabaseCvRepository } from '@/lib/adapters/supabase-cv-repository'
import { SupabaseGenerationRepository } from '@/lib/adapters/supabase-generation-repository'
import { UnpdfExtractor } from '@/lib/adapters/unpdf-extractor'
import { GeminiEmbeddingProvider } from '@/lib/adapters/gemini-embeddings'
import { GeminiLlmProvider } from '@/lib/adapters/gemini-llm'
import { UpstashRateLimiter } from '@/lib/adapters/upstash-rate-limiter'
import { MemoryRateLimiter } from '@/lib/adapters/memory-rate-limiter'
import { SupabaseLlmCallLogger } from '@/lib/adapters/supabase-llm-call-logger'
import { UploadCvUseCase } from '@/lib/use-cases/upload-cv'
import { GenerateTailoredCvUseCase } from '@/lib/use-cases/generate-tailored-cv'
import { GenerateSpeechUseCase } from '@/lib/use-cases/generate-speech.use-case'
import type { CvRepository } from '@/lib/ports/cv-repository'
import type { GenerationRepository } from '@/lib/ports/generation-repository'
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

export function createGenerationRepository(): GenerationRepository {
  return new SupabaseGenerationRepository(createSupabaseServiceClient())
}

export function createGenerateSpeechUseCase(): GenerateSpeechUseCase {
  return new GenerateSpeechUseCase(
    new GeminiLlmProvider(process.env.GOOGLE_API_KEY!),
    createGenerationRepository(),
  )
}

export function createGenerateTailoredCvUseCase(): GenerateTailoredCvUseCase {
  const serviceClient = createSupabaseServiceClient()
  return new GenerateTailoredCvUseCase(
    new GeminiLlmProvider(process.env.GOOGLE_API_KEY!),
    createGenerationRepository(),
    new SupabaseLlmCallLogger(serviceClient),
  )
}
