import { vi } from 'vitest'
import type { CvRepository } from '@/lib/ports/cv-repository'
import type { LlmProvider } from '@/lib/ports/llm-provider'
import type { EmbeddingProvider } from '@/lib/ports/embedding-provider'
import type { GenerationRepository } from '@/lib/ports/generation-repository'
import type { PdfExtractor } from '@/lib/ports/pdf-extractor'
import type { RateLimiter } from '@/lib/ports/rate-limiter'

export function createTestCvRepository(): CvRepository {
  return {
    saveChunks: vi.fn().mockResolvedValue(undefined),
    findRelevantChunks: vi.fn().mockResolvedValue([]),
    deleteForUser: vi.fn().mockResolvedValue(undefined),
  }
}

export function createTestLlmProvider(): LlmProvider {
  return {
    complete: vi.fn().mockResolvedValue({ text: '{}', latencyMs: 100 }),
  }
}

export function createTestEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue(Array(768).fill(0.1)),
    embedBatch: vi.fn().mockResolvedValue([Array(768).fill(0.1)]),
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
