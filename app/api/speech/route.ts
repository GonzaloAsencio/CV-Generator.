import { createClient as createAuthClient } from '@/lib/supabase/server'
import { SpeechInputSchema } from '@/lib/schemas/api-inputs.schema'
import { createGenerateSpeechUseCase, createRateLimiter } from '@/lib/composition/container'
import { NoCvUploadedForSpeechError, LlmInvalidSpeechOutputError } from '@/lib/use-cases/generate-speech.use-case'
import { IdempotencyCache } from '@/lib/utils/idempotency'
import type { Speech } from '@/lib/schemas/speech.schema'

export const maxDuration = 60

interface SpeechResponse {
  speech: Speech
  meta: { chunksUsed: number; topSimilarity: number; generationId: string }
}

const speechCache = new IdempotencyCache<SpeechResponse>()

function err(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
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
  const validation = SpeechInputSchema.safeParse(body)
  if (!validation.success) {
    const first = validation.error.issues[0]
    return err('VALIDATION_ERROR', first.message, 400)
  }
  const { jobOffer, company, generatedCvId } = validation.data

  // Fetch CV text from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cv_text')
    .eq('user_id', user.id)
    .single()

  if (!profile?.cv_text) {
    return err('NOT_FOUND', 'No tenés CV guardado — completá tu perfil primero', 404)
  }
  const cvText = profile.cv_text

  // Idempotency — fast path before rate limit and use case
  const idempotencyKey = request.headers.get('Idempotency-Key') ?? undefined
  if (idempotencyKey) {
    const cached = speechCache.get(`${user.id}:${idempotencyKey}`)
    if (cached) return Response.json(cached)
  }

  // Rate limit
  const allowed = await createRateLimiter().check(user.id, 'speech')
  if (!allowed) return err('RATE_LIMIT', 'Demasiadas generaciones — esperá antes de intentar de nuevo', 429)

  // Run use case
  let result: Awaited<ReturnType<ReturnType<typeof createGenerateSpeechUseCase>['execute']>>
  try {
    result = await createGenerateSpeechUseCase().execute({
      userId: user.id,
      cvText,
      jobOffer,
      company,
      generatedCvId,
      idempotencyKey,
    })
  } catch (e) {
    if (e instanceof NoCvUploadedForSpeechError) {
      return err('NOT_FOUND', 'No CV uploaded — subí tu CV antes de generar el speech', 404)
    }
    if (e instanceof LlmInvalidSpeechOutputError) {
      return err('LLM_INVALID_OUTPUT', e.validationDetail, 422)
    }
    return err('INTERNAL', 'Speech generation failed', 500)
  }

  const response: SpeechResponse = {
    speech: result.speech,
    meta: {
      chunksUsed: result.chunksUsed,
      topSimilarity: result.topSimilarity,
      generationId: result.generationId,
    },
  }

  if (idempotencyKey) {
    speechCache.set(`${user.id}:${idempotencyKey}`, response)
  }

  return Response.json(response)
}
