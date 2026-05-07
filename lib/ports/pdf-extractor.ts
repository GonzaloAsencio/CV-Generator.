export interface PdfExtractor {
  extractText(buffer: Buffer): Promise<string>
}
