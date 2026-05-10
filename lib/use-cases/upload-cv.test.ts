import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadCvUseCase } from './upload-cv'
import { createTestPdfExtractor } from '@/lib/composition/test-container'

describe('UploadCvUseCase', () => {
  let pdfExtractor: ReturnType<typeof createTestPdfExtractor>
  let useCase: UploadCvUseCase

  const userId = 'user-123'
  const buffer = Buffer.from('fake pdf content')

  beforeEach(() => {
    pdfExtractor = createTestPdfExtractor()
    useCase = new UploadCvUseCase(pdfExtractor)
  })

  it('should extract text from the PDF buffer', async () => {
    await useCase.execute({ userId, buffer })

    expect(pdfExtractor.extractText).toHaveBeenCalledWith(buffer)
  })

  it('should return the extracted text', async () => {
    const text = 'My CV content'
    vi.mocked(pdfExtractor.extractText).mockResolvedValue(text)

    const result = await useCase.execute({ userId, buffer })

    expect(result.extractedText).toBe(text)
  })

  it('should throw when the PDF yields no extractable text', async () => {
    vi.mocked(pdfExtractor.extractText).mockResolvedValue('   ')

    await expect(useCase.execute({ userId, buffer })).rejects.toThrow(
      'Could not extract text from PDF',
    )
  })
})
