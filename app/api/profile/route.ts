import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function err(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

export async function GET(request: Request) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('UNAUTHORIZED', 'Authentication required', 401)

  const { data } = await supabase
    .from('user_profiles')
    .select('cv_text, cv_uploaded_at, full_name, email, phone, location, linkedin_url, github_url')
    .eq('user_id', user.id)
    .single()

  return Response.json({
    cvText:       data?.cv_text ?? null,
    cvUploadedAt: data?.cv_uploaded_at ?? null,
    fullName:     data?.full_name ?? null,
    email:        data?.email ?? null,
    phone:        data?.phone ?? null,
    location:     data?.location ?? null,
    linkedinUrl:  data?.linkedin_url ?? null,
    githubUrl:    data?.github_url ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return err('UNAUTHORIZED', 'Authentication required', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err('VALIDATION_ERROR', 'Invalid JSON body', 400)
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )

  // Rama: actualizar cv_text
  if ('cvText' in (body as object)) {
    const { cvText } = body as { cvText?: unknown }
    if (typeof cvText !== 'string') {
      return err('VALIDATION_ERROR', 'cvText debe ser un string', 400)
    }
    if (cvText.length > 50_000) {
      return err('VALIDATION_ERROR', 'CV demasiado largo (máx 50.000 caracteres)', 400)
    }
    await serviceClient.from('user_profiles').upsert({
      user_id: user.id,
      cv_text: cvText,
      updated_at: new Date().toISOString(),
    })
    return Response.json({ success: true })
  }

  // Rama: actualizar datos personales
  if ('personalInfo' in (body as object)) {
    const d = (body as { personalInfo: Record<string, unknown> }).personalInfo
    if (typeof d !== 'object' || d === null) {
      return err('VALIDATION_ERROR', 'personalInfo debe ser un objeto', 400)
    }
    const fullName = typeof d.fullName === 'string' ? d.fullName.slice(0, 120) : null
    const email    = typeof d.email    === 'string' ? d.email.slice(0, 200)    : null
    const phone    = typeof d.phone    === 'string' ? d.phone.slice(0, 30)     : null
    const location = typeof d.location === 'string' ? d.location.slice(0, 120) : null
    const linkedinUrl = typeof d.linkedinUrl === 'string' ? d.linkedinUrl.slice(0, 300) : null
    const githubUrl   = typeof d.githubUrl   === 'string' ? d.githubUrl.slice(0, 300)   : null

    await serviceClient.from('user_profiles').upsert({
      user_id:      user.id,
      full_name:    fullName    || null,
      email:        email       || null,
      phone:        phone       || null,
      location:     location    || null,
      linkedin_url: linkedinUrl || null,
      github_url:   githubUrl   || null,
      updated_at:   new Date().toISOString(),
    })
    return Response.json({ success: true })
  }

  return err('VALIDATION_ERROR', 'El body debe incluir cvText o personalInfo', 400)
}
