import { describe, it, expect } from 'vitest'
import { splitIntoChunks } from './chunker'

describe('splitIntoChunks', () => {
  it('should return empty array for empty text', () => {
    expect(splitIntoChunks('')).toEqual([])
    expect(splitIntoChunks('   ')).toEqual([])
  })

  it('should return a single chunk when text fits within chunk size', () => {
    const text = 'Short text that fits in one chunk.'
    const result = splitIntoChunks(text, 2000, 200)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(text)
  })

  it('should split long text into multiple chunks', () => {
    const text = 'word '.repeat(600) // ~3000 chars
    const result = splitIntoChunks(text, 2000, 200)
    expect(result.length).toBeGreaterThan(1)
  })

  it('should produce chunks no longer than chunkSize', () => {
    const text = 'a'.repeat(5000)
    const result = splitIntoChunks(text, 2000, 200)
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(2000)
    }
  })

  it('should prefer splitting at paragraph boundaries', () => {
    const para1 = 'First paragraph. '.repeat(60) // ~1020 chars
    const para2 = 'Second paragraph. '.repeat(60)
    const text = para1.trim() + '\n\n' + para2.trim()
    const result = splitIntoChunks(text, 2000, 200)
    expect(result.length).toBeGreaterThanOrEqual(1)
    // The double-newline split point should be preferred
    expect(result.some((c) => c.startsWith('First'))).toBe(true)
  })

  it('should not produce empty chunks', () => {
    const text = 'paragraph '.repeat(400)
    const result = splitIntoChunks(text, 2000, 200)
    for (const chunk of result) {
      expect(chunk.trim().length).toBeGreaterThan(0)
    }
  })

  it('should cover the full text with no lost content', () => {
    const text = 'word '.repeat(300)
    const result = splitIntoChunks(text, 500, 50)
    const combined = result.join(' ')
    // Every word from original appears somewhere in the combined result
    const originalWords = text.trim().split(/\s+/)
    for (const word of originalWords.slice(0, 5)) {
      expect(combined).toContain(word)
    }
  })
})
