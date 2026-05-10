import { z } from 'zod'

export const ExperienceEntrySchema = z.object({
  id:         z.string(),
  title:      z.string(),
  company:    z.string(),
  location:   z.string(),
  period:     z.string(),
  highlights: z.array(z.string()),
})

export const EducationEntrySchema = z.object({
  id:          z.string(),
  degree:      z.string(),
  institution: z.string(),
  location:    z.string(),
  year:        z.string(),
  honors:      z.string().optional(),
})

export const ProfileDataSchema = z.object({
  experience: z.array(ExperienceEntrySchema).default([]),
  education:  z.array(EducationEntrySchema).default([]),
  skills: z.object({
    technical: z.array(z.string()).default([]),
    soft:      z.array(z.string()).default([]),
  }).default({ technical: [], soft: [] }),
  certifications: z.array(z.string()).default([]),
  languages: z.array(z.object({
    language: z.string(),
    level:    z.string(),
  })).default([]),
})

export type ProfileData     = z.infer<typeof ProfileDataSchema>
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>
export type EducationEntry  = z.infer<typeof EducationEntrySchema>
