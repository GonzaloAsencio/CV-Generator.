import { createClient as createAuthClient } from '@/lib/supabase/server'
import { GenerateInputSchema } from '@/lib/schemas/api-inputs.schema'
import { createGenerateTailoredCvUseCase, createRateLimiter } from '@/lib/composition/container'
import { NoCvUploadedError, LlmInvalidOutputError } from '@/lib/use-cases/generate-tailored-cv'
import { IdempotencyCache } from '@/lib/utils/idempotency'
import type { HarvardCv } from '@/lib/schemas/harvard-cv.schema'
import { ProfileDataSchema } from '@/lib/schemas/profile-data.schema'

export const maxDuration = 60

interface GenerateResponse {
  cv: HarvardCv
  meta: { chunksUsed: number; topSimilarity: number; generationId: string }
}

const generateCache = new IdempotencyCache<GenerateResponse>()

function err(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

function isGeminiRateLimit(e: unknown): boolean {
  return (
    e instanceof Error &&
    'status' in e &&
    (e as { status: number }).status === 429
  )
}

export async function POST(request: Request) {
  // Auth
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('UNAUTHORIZED', 'Authentication required', 401)

  // Parse JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  // Zod validate
  const validation = GenerateInputSchema.safeParse(body)
  if (!validation.success) {
    const first = validation.error.issues[0]
    return err('VALIDATION_ERROR', first.message, 400)
  }
  const { jobOffer, company } = validation.data

  // Fetch CV text and personal info from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cv_text, full_name, email, phone, location, linkedin_url, github_url, profile_data')
    .eq('user_id', user.id)
    .single()

  const profileData = profile?.profile_data
    ? ProfileDataSchema.safeParse(profile.profile_data).data
    : undefined

  const useStructured = !!profileData && profileData.experience.length > 0

  if (!profile || (!profile.cv_text && !useStructured)) {
    return err('NOT_FOUND', 'Completá tu experiencia en Mi perfil antes de generar', 404)
  }

  const cvText = profile.cv_text ?? ''

  const personalInfo = {
    name:     profile.full_name    || undefined,
    email:    profile.email        || undefined,
    phone:    profile.phone        || undefined,
    location: profile.location     || undefined,
    linkedin: profile.linkedin_url || undefined,
    github:   profile.github_url   || undefined,
  }

  // Idempotency — fast path before rate limit and use case
  const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined
  if (idempotencyKey) {
    const cached = generateCache.get(`${user.id}:${idempotencyKey}`)
    if (cached) return Response.json(cached)
  }

  // Rate limit
  const allowed = await createRateLimiter().check(user.id, 'generate')
  if (!allowed) return err('RATE_LIMIT', 'Demasiadas generaciones — esperá antes de intentar de nuevo', 429)

  // Run use case
  let result: Awaited<ReturnType<ReturnType<typeof createGenerateTailoredCvUseCase>['execute']>>
  try {
    result = await createGenerateTailoredCvUseCase().execute({
      userId: user.id,
      cvText,
      jobOffer,
      company,
      idempotencyKey,
      personalInfo,
      profileData,
    })
  } catch (e) {
    if (e instanceof NoCvUploadedError) {
      return err('NOT_FOUND', 'No CV uploaded — subí tu CV antes de generar', 404)
    }
    if (e instanceof LlmInvalidOutputError) {
      return err('LLM_INVALID_OUTPUT', e.validationDetail, 422)
    }
    if (isGeminiRateLimit(e)) {
      return err('RATE_LIMIT', 'Cuota de Gemini agotada — intentá de nuevo más tarde', 429)
    }
    console.error('[/api/generate] Unhandled error:', e)
    return err('INTERNAL', 'Generation failed', 500)
  }

  const response: GenerateResponse = {
    cv: result.cv,
    meta: {
      chunksUsed: result.chunksUsed,
      topSimilarity: result.topSimilarity,
      generationId: result.generationId,
    },
  }

  // Cache result for idempotency repeat calls
  if (idempotencyKey) {
    generateCache.set(`${user.id}:${idempotencyKey}`, response)
  }

  return Response.json(response)
}
