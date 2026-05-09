import { describe, expect, it } from 'vitest'
import { CompanySchema, GenerateInputSchema, SpeechInputSchema, UploadInputSchema } from './api-inputs.schema'

describe('CompanySchema', () => {
  it('should accept company with only name', () => {
    expect(CompanySchema.safeParse({ name: 'Acme' }).success).toBe(true)
  })

  it('should reject missing name', () => {
    expect(CompanySchema.safeParse({ industry: 'Tech' }).success).toBe(false)
  })

  it('should reject empty name', () => {
    expect(CompanySchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('UploadInputSchema', () => {
  it('should accept valid PDF under 5MB', () => {
    const result = UploadInputSchema.safeParse({ fileSize: 1_000_000, mimeType: 'application/pdf' })
    expect(result.success).toBe(true)
  })

  it('should reject file over 5MB', () => {
    const result = UploadInputSchema.safeParse({ fileSize: 6_000_000, mimeType: 'application/pdf' })
    expect(result.success).toBe(false)
  })

  it('should reject non-PDF MIME type', () => {
    const result = UploadInputSchema.safeParse({ fileSize: 1_000_000, mimeType: 'image/png' })
    expect(result.success).toBe(false)
  })
})

describe('GenerateInputSchema', () => {
  const validInput = {
    jobOffer: 'We are looking for a senior TypeScript developer with 5+ years of experience building scalable web applications.',
    company: { name: 'Acme Corp' },
  }

  it('should accept valid input', () => {
    expect(GenerateInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('should reject jobOffer under 100 chars', () => {
    const result = GenerateInputSchema.safeParse({ ...validInput, jobOffer: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('should reject missing company name', () => {
    const result = GenerateInputSchema.safeParse({ ...validInput, company: {} })
    expect(result.success).toBe(false)
  })
})

describe('SpeechInputSchema', () => {
  it('should accept input with optional generatedCvId', () => {
    const result = SpeechInputSchema.safeParse({
      jobOffer: 'Looking for a developer',
      company: { name: 'Acme' },
      generatedCvId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID for generatedCvId', () => {
    const result = SpeechInputSchema.safeParse({
      jobOffer: 'Looking for a developer',
      company: { name: 'Acme' },
      generatedCvId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})
