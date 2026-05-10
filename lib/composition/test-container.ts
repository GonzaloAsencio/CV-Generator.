import { vi } from 'vitest'
import type { LlmProvider } from '@/lib/ports/llm-provider'
import type { GenerationRepository } from '@/lib/ports/generation-repository'
import type { PdfExtractor } from '@/lib/ports/pdf-extractor'
import type { RateLimiter } from '@/lib/ports/rate-limiter'

export function createTestLlmProvider(): LlmProvider {
  return {
    complete: vi.fn().mockResolvedValue({ text: '{}', latencyMs: 100 }),
  }
}

export function createTestGenerationRepository(): GenerationRepository {
  return {
    saveCv: vi.fn().mockResolvedValue({ id: 'test-cv-id' }),
    saveSpeech: vi.fn().mockResolvedValue({ id: 'test-speech-id' }),
    findCvByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findSpeechByIdempotencyKey: vi.fn().mockResolvedValue(null),
  }
}

export function createTestPdfExtractor(): PdfExtractor {
  return {
    extractText: vi.fn().mockResolvedValue('Extracted PDF text content'),
  }
}

export function createTestRateLimiter(): RateLimiter {
  return {
    check: vi.fn().mockResolvedValue(true),
  }
}
