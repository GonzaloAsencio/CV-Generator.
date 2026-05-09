import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { UploadInputSchema } from '@/lib/schemas/api-inputs.schema'
import { createUploadCvUseCase } from '@/lib/composition/container'

export const maxDuration = 60

function err(code: string, message: string, status: number, details?: unknown) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status })
}

export async function POST(request: Request) {
  // Auth
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('UNAUTHORIZED', 'Authentication required', 401)

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return err('VALIDATION_ERROR', 'Invalid multipart form data', 400)
  }

  const file = formData.get('cv')
  if (!(file instanceof File)) {
    return err('VALIDATION_ERROR', 'No se recibió archivo', 400)
  }

  // Zod validation (type + size)
  const validation = UploadInputSchema.safeParse({
    fileSize: file.size,
    mimeType: file.type,
  })
  if (!validation.success) {
    const first = validation.error.issues[0]
    return err('VALIDATION_ERROR', first.message, 400)
  }

  // Run use case
  const buffer = Buffer.from(await file.arrayBuffer())
  const useCase = createUploadCvUseCase()

  let chunks: number
  try {
    const result = await useCase.execute({ userId: user.id, buffer })
    chunks = result.chunks
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    if (msg.includes('Could not extract text')) {
      return err('VALIDATION_ERROR', msg, 422)
    }
    return err('INTERNAL', msg, 500)
  }

  // Store original PDF in Supabase Storage
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )
  const storagePath = `${user.id}/cv-original.pdf`
  await serviceClient.storage.from('cvs').upload(storagePath, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  // Update user_profiles
  await serviceClient.from('user_profiles').upsert({
    user_id: user.id,
    cv_uploaded_at: new Date().toISOString(),
    cv_chunks_count: chunks,
    cv_storage_path: storagePath,
    updated_at: new Date().toISOString(),
  })

  return Response.json({ success: true, chunks })
}
