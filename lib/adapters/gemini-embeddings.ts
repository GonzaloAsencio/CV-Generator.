import { GoogleGenerativeAI, TaskType, type EmbedContentRequest } from '@google/generative-ai'
import type { EmbeddingProvider } from '@/lib/ports/embedding-provider'

// outputDimensionality is accepted by the API but not yet typed in SDK v0.24.
type EmbedRequest = EmbedContentRequest & { outputDimensionality?: number }

const EMBEDDING_MODEL = 'text-embedding-004'
const OUTPUT_DIMENSIONALITY = 768
const BATCH_SIZE = 10

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly model

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: OUTPUT_DIMENSIONALITY,
    } as EmbedRequest)
    return result.embedding.values
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...embeddings)
    }
    return results
  }
}
