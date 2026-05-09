import { z } from 'zod'

export const HarvardCvSchema = z.object({
  personal: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    location: z.string().min(1),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }),
  title: z.string().min(1),
  summary: z.string().max(600),
  experience: z.array(
    z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      location: z.string().min(1),
      period: z.string().min(1),
      highlights: z.array(z.string().min(1)).min(1).max(5),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string().min(1),
      institution: z.string().min(1),
      location: z.string().min(1),
      year: z.string().min(1),
      honors: z.string().optional(),
    }),
  ),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
  }),
  certifications: z.array(z.string()).optional(),
  languages: z.array(
    z.object({
      language: z.string().min(1),
      level: z.string().min(1),
    }),
  ),
})

export type HarvardCv = z.infer<typeof HarvardCvSchema>
