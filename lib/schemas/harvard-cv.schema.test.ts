import { describe, expect, it } from 'vitest'
import { HarvardCvSchema } from './harvard-cv.schema'
import type { HarvardCv } from './harvard-cv.schema'

const validCv: HarvardCv = {
  personal: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+54 11 1234-5678',
    location: 'Buenos Aires, Argentina',
  },
  title: 'Senior TypeScript Developer',
  summary: 'Experienced developer with 8 years building scalable web apps.',
  experience: [
    {
      title: 'Senior Developer',
      company: 'Acme Corp',
      location: 'Buenos Aires',
      period: '2020 – Present',
      highlights: ['Led migration to microservices reducing latency by 40%'],
    },
  ],
  education: [
    {
      degree: 'Licenciatura en Sistemas',
      institution: 'UBA',
      location: 'Buenos Aires',
      year: '2016',
    },
  ],
  skills: {
    technical: ['TypeScript', 'React', 'Node.js'],
    soft: ['Leadership', 'Communication'],
  },
  languages: [{ language: 'Spanish', level: 'Native' }],
}

describe('HarvardCvSchema', () => {
  it('should accept valid CV data', () => {
    expect(HarvardCvSchema.safeParse(validCv).success).toBe(true)
  })

  it('should accept optional fields absent', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { certifications: _, ...withoutCerts } = validCv
    expect(HarvardCvSchema.safeParse(withoutCerts).success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = HarvardCvSchema.safeParse({
      ...validCv,
      personal: { ...validCv.personal, email: 'not-an-email' },
    })
    expect(result.success).toBe(false)
  })

  it('should reject summary over 600 chars', () => {
    const result = HarvardCvSchema.safeParse({
      ...validCv,
      summary: 'x'.repeat(601),
    })
    expect(result.success).toBe(false)
  })

  it('should reject experience with more than 5 highlights', () => {
    const result = HarvardCvSchema.safeParse({
      ...validCv,
      experience: [
        { ...validCv.experience[0], highlights: ['1', '2', '3', '4', '5', '6'] },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('should reject experience with zero highlights', () => {
    const result = HarvardCvSchema.safeParse({
      ...validCv,
      experience: [{ ...validCv.experience[0], highlights: [] }],
    })
    expect(result.success).toBe(false)
  })
})
