import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/sign-out-button'
import { CvUploadForm } from '@/components/cv-upload-form'
import { GenerateSection } from '@/components/generate-section'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cv_chunks_count, cv_uploaded_at, full_name')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="font-bold text-lg shrink-0">CV Tailor AI</h1>
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:inline text-sm text-gray-500 truncate">{user.email}</span>
          <Link
            href="/profile"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Perfil
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-8 sm:space-y-10">
        {!profile?.full_name && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium text-amber-800">Completá tus datos personales</p>
            <p className="text-amber-700 mt-0.5">
              Sin tu nombre y contacto el CV generado puede mostrar datos de ejemplo.{' '}
              <Link href="/profile" className="underline underline-offset-2 font-medium hover:text-amber-900">
                Ir a Mi perfil →
              </Link>
            </p>
          </div>
        )}

        <section id="cv-upload">
          <h2 className="text-xl font-semibold mb-1">Tu CV base</h2>
          {profile?.cv_uploaded_at ? (
            <p className="mb-4 text-sm text-gray-500">
              Último CV cargado el{' '}
              {new Date(profile.cv_uploaded_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              · {profile.cv_chunks_count} chunk{profile.cv_chunks_count !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="mb-4 text-sm text-gray-500">
              Todavía no subiste un CV. Subilo para poder generar versiones adaptadas.
            </p>
          )}
          <CvUploadForm />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-1">Generar CV adaptado</h2>
          <p className="mb-4 text-sm text-gray-500">
            Completá los datos de la empresa y pegá la oferta para obtener un CV Harvard personalizado.
          </p>
          <GenerateSection />
        </section>
      </div>
    </main>
  )
}
