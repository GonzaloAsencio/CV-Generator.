import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UploadCvUseCase } from './upload-cv'
import {
  createTestCvRepository,
  createTestEmbeddingProvider,
  createTestPdfExtractor,
} from '@/lib/composition/test-container'

describe('UploadCvUseCase', () => {
  let pdfExtractor: ReturnType<typeof createTestPdfExtractor>
  let embeddingProvider: ReturnType<typeof createTestEmbeddingProvider>
  let cvRepository: ReturnType<typeof createTestCvRepository>
  let useCase: UploadCvUseCase

  const userId = 'user-123'
  const buffer = Buffer.from('fake pdf content')

  beforeEach(() => {
    pdfExtractor = createTestPdfExtractor()
    embeddingProvider = createTestEmbeddingProvider()
    cvRepository = createTestCvRepository()
    useCase = new UploadCvUseCase(pdfExtractor, embeddingProvider, cvRepository)
  })

  // Ciclo 1 — extrae texto del PDF
  it('should extract text from the PDF buffer', async () => {
    await useCase.execute({ userId, buffer })

    expect(pdfExtractor.extractText).toHaveBeenCalledWith(buffer)
  })

  // Ciclo 2 — chunkea el texto
  it('should split long text into multiple chunks and report count', async () => {
    const longText = 'word '.repeat(700) // ~3500 chars → >1 chunk
    vi.mocked(pdfExtractor.extractText).mockResolvedValue(longText)
    vi.mocked(embeddingProvider.embedBatch).mockResolvedValue(
      Array(10).fill(Array(768).fill(0.1)),
    )

    const result = await useCase.execute({ userId, buffer })

    expect(result.chunks).toBeGreaterThan(1)
  })

  // Ciclo 3 — llama a embedBatch con los chunks
  it('should call embedBatch once with all chunk texts', async () => {
    await useCase.execute({ userId, buffer })

    expect(embeddingProvider.embedBatch).toHaveBeenCalledTimes(1)
    expect(embeddingProvider.embedBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(String)]),
    )
  })

  // Ciclo 4 — persiste con el repo
  it('should save chunks to the repository with correct shape', async () => {
    await useCase.execute({ userId, buffer })

    expect(cvRepository.saveChunks).toHaveBeenCalledWith(
      userId,
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.any(String),
          embedding: expect.any(Array),
          chunkIndex: expect.any(Number),
        }),
      ]),
    )
  })

  // Ciclo 5 — borra chunks viejos ANTES de guardar
  it('should delete old chunks before saving new ones', async () => {
    const callOrder: string[] = []
    vi.mocked(cvRepository.deleteForUser).mockImplementation(async () => {
      callOrder.push('delete')
    })
    vi.mocked(cvRepository.saveChunks).mockImplementation(async () => {
      callOrder.push('save')
    })

    await useCase.execute({ userId, buffer })

    expect(callOrder).toEqual(['delete', 'save'])
  })

  it('should throw when the PDF yields no extractable text', async () => {
    vi.mocked(pdfExtractor.extractText).mockResolvedValue('   ')

    await expect(useCase.execute({ userId, buffer })).rejects.toThrow(
      'Could not extract text from PDF',
    )
  })

  it('should return the exact number of chunks saved', async () => {
    const text = 'Sentence. '.repeat(50) // short text → single chunk
    vi.mocked(pdfExtractor.extractText).mockResolvedValue(text)

    const result = await useCase.execute({ userId, buffer })

    const savedChunks = vi.mocked(cvRepository.saveChunks).mock.calls[0][1]
    expect(result.chunks).toBe(savedChunks.length)
  })
})
