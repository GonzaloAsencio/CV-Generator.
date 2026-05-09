import { describe, it, expect, vi } from 'vitest'
import { UnpdfExtractor } from './unpdf-extractor'

vi.mock('unpdf', () => ({
  extractText: vi.fn(),
}))

import { extractText } from 'unpdf'

const mockExtractText = vi.mocked(extractText)

describe('UnpdfExtractor', () => {
  const extractor = new UnpdfExtractor()
  const buffer = Buffer.from('fake pdf bytes')

  it('should return merged text from all pages', async () => {
    mockExtractText.mockResolvedValue({ text: 'Page 1 content\nPage 2 content', totalPages: 2 })

    const result = await extractor.extractText(buffer)

    expect(result).toBe('Page 1 content\nPage 2 content')
  })

  it('should pass buffer as Uint8Array with mergePages:true', async () => {
    mockExtractText.mockResolvedValue({ text: 'text', totalPages: 1 })

    await extractor.extractText(buffer)

    expect(mockExtractText).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      { mergePages: true },
    )
  })

  it('should trim leading and trailing whitespace', async () => {
    mockExtractText.mockResolvedValue({ text: '  Hello World  ', totalPages: 1 })

    const result = await extractor.extractText(buffer)

    expect(result).toBe('Hello World')
  })

  it('should handle single-page PDFs', async () => {
    mockExtractText.mockResolvedValue({ text: 'Single page text', totalPages: 1 })

    const result = await extractor.extractText(buffer)

    expect(result).toBe('Single page text')
  })
})
