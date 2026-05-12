import { z } from 'zod'

export const CompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  culture: z.string().optional(),
  notes: z.string().optional(),
})

export const UploadInputSchema = z.object({
  fileSize: z.number().max(5 * 1024 * 1024, 'File must be under 5MB'),
  mimeType: z.literal('application/pdf', { error: 'Only PDF files are accepted' }),
})

export const GenerateInputSchema = z.object({
  jobOffer: z.string().min(100, 'Job offer must be at least 100 characters'),
  company: CompanySchema,
  language: z.enum(['es', 'en']).optional(),
  provider: z.enum(['gemini', 'lm-studio']).optional(),
})

export const SpeechInputSchema = z.object({
  jobOffer: z.string().min(1),
  company: CompanySchema,
  generatedCvId: z.string().uuid().optional(),
})

export type CvLanguage = 'es' | 'en'
export type LlmProviderName = 'gemini' | 'lm-studio'

export type CompanyInput = z.infer<typeof CompanySchema>
export type GenerateInput = z.infer<typeof GenerateInputSchema>
export type SpeechInput = z.infer<typeof SpeechInputSchema>
