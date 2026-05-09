import { describe, expect, it } from 'vitest'
import { SpeechSchema } from './speech.schema'

const validSpeech = {
  full_text: 'Full speech text here...',
  sections: {
    introduction: 'Hi, I am Jane.',
    motivation: 'I want to join Acme Corp because...',
    technical_skills: 'I have 8 years of TypeScript experience.',
    value_proposition: 'I will bring X to your team.',
  },
  word_count: 400,
  estimated_duration_minutes: 2.5,
}

describe('SpeechSchema', () => {
  it('should accept valid speech data', () => {
    expect(SpeechSchema.safeParse(validSpeech).success).toBe(true)
  })

  it('should reject word_count below 350', () => {
    const result = SpeechSchema.safeParse({ ...validSpeech, word_count: 349 })
    expect(result.success).toBe(false)
  })

  it('should reject word_count above 450', () => {
    const result = SpeechSchema.safeParse({ ...validSpeech, word_count: 451 })
    expect(result.success).toBe(false)
  })

  it('should reject non-integer word_count', () => {
    const result = SpeechSchema.safeParse({ ...validSpeech, word_count: 400.5 })
    expect(result.success).toBe(false)
  })

  it('should reject missing section', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sections: { introduction: _, ...sectionsWithout } } = validSpeech
    const result = SpeechSchema.safeParse({
      ...validSpeech,
      sections: sectionsWithout,
    })
    expect(result.success).toBe(false)
  })

  it('should reject negative duration', () => {
    const result = SpeechSchema.safeParse({ ...validSpeech, estimated_duration_minutes: -1 })
    expect(result.success).toBe(false)
  })
})
