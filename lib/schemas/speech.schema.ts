import { z } from 'zod'

export const SpeechSchema = z.object({
  full_text: z.string().min(1),
  sections: z.object({
    introduction: z.string().min(1),
    motivation: z.string().min(1),
    technical_skills: z.string().min(1),
    value_proposition: z.string().min(1),
  }),
  word_count: z.number().int().min(350).max(450),
  estimated_duration_minutes: z.number().positive(),
})

export type Speech = z.infer<typeof SpeechSchema>
