import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { SupabaseGenerationRepository } from '@/lib/adapters/supabase-generation-repository'
import { UnpdfExtractor } from '@/lib/adapters/unpdf-extractor'
import { GeminiLlmProvider } from '@/lib/adapters/gemini-llm'
import { LmStudioLlmProvider } from '@/lib/adapters/lm-studio-llm'
import { UpstashRateLimiter } from '@/lib/adapters/upstash-rate-limiter'
import { MemoryRateLimiter } from '@/lib/adapters/memory-rate-limiter'
import { SupabaseLlmCallLogger } from '@/lib/adapters/supabase-llm-call-logger'
import { UploadCvUseCase } from '@/lib/use-cases/upload-cv'
import { GenerateTailoredCvUseCase } from '@/lib/use-cases/generate-tailored-cv'
import { GenerateSpeechUseCase } from '@/lib/use-cases/generate-speech.use-case'
import type { GenerationRepository } from '@/lib/ports/generation-repository'
import type { RateLimiter } from '@/lib/ports/rate-limiter'
import type { LlmProvider } from '@/lib/ports/llm-provider'

function createLlmProvider(): LlmProvider {
  const lmStudioUrl = process.env.LM_STUDIO_BASE_URL
  if (lmStudioUrl) {
    return new LmStudioLlmProvider(
      lmStudioUrl,
      process.env.LM_STUDIO_MODEL,
      process.env.LM_STUDIO_MAX_TOKENS ? Number(process.env.LM_STUDIO_MAX_TOKENS) : undefined,
    )
  }
  return new GeminiLlmProvider(process.env.GOOGLE_API_KEY!)
}

function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
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
  return new UploadCvUseCase(new UnpdfExtractor())
}

export function createGenerationRepository(): GenerationRepository {
  return new SupabaseGenerationRepository(createSupabaseServiceClient())
}

export function createGenerateSpeechUseCase(): GenerateSpeechUseCase {
  return new GenerateSpeechUseCase(
    createLlmProvider(),
    createGenerationRepository(),
  )
}

export function createGenerateTailoredCvUseCase(): GenerateTailoredCvUseCase {
  const serviceClient = createSupabaseServiceClient()
  return new GenerateTailoredCvUseCase(
    createLlmProvider(),
    createGenerationRepository(),
    new SupabaseLlmCallLogger(serviceClient),
  )
}
