import type { PdfExtractor } from '@/lib/ports/pdf-extractor'
import type { EmbeddingProvider } from '@/lib/ports/embedding-provider'
import type { CvRepository } from '@/lib/ports/cv-repository'
import { splitIntoChunks } from '@/lib/utils/chunker'

export interface UploadCvInput {
  userId: string
  buffer: Buffer
}

export interface UploadCvOutput {
  chunks: number
  extractedText: string
}

export class UploadCvUseCase {
  constructor(
    private readonly pdfExtractor: PdfExtractor,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly cvRepository: CvRepository,
  ) {}

  async execute(input: UploadCvInput): Promise<UploadCvOutput> {
    const text = await this.pdfExtractor.extractText(input.buffer)
    if (!text.trim()) throw new Error('Could not extract text from PDF')

    const chunks = splitIntoChunks(text)
    if (chunks.length === 0) throw new Error('Could not extract text from PDF')

    await this.cvRepository.deleteForUser(input.userId)

    const embeddings = await this.embeddingProvider.embedBatch(chunks)

    const cvChunks = chunks.map((content, i) => ({
      content,
      embedding: embeddings[i],
      chunkIndex: i,
    }))

    await this.cvRepository.saveChunks(input.userId, cvChunks)

    return { chunks: cvChunks.length, extractedText: text }
  }
}
