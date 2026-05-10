import type { PdfExtractor } from '@/lib/ports/pdf-extractor'

export interface UploadCvInput {
  userId: string
  buffer: Buffer
}

export interface UploadCvOutput {
  extractedText: string
}

export class UploadCvUseCase {
  constructor(
    private readonly pdfExtractor: PdfExtractor,
  ) {}

  async execute(input: UploadCvInput): Promise<UploadCvOutput> {
    const text = await this.pdfExtractor.extractText(input.buffer)
    if (!text.trim()) throw new Error('Could not extract text from PDF')
    return { extractedText: text }
  }
}
