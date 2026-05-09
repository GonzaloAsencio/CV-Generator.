import { extractText } from 'unpdf'
import type { PdfExtractor } from '@/lib/ports/pdf-extractor'

export class UnpdfExtractor implements PdfExtractor {
  async extractText(buffer: Buffer): Promise<string> {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true })
    return result.text.trim()
  }
}
