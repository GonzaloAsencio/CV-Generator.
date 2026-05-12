import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignInButton } from '@/components/sign-in-button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="bg-white p-8 rounded-md border border-rule w-full max-w-sm shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-ink text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-ink">CV Generator</h1>
        <p className="text-ink-4 text-center text-sm mb-6">
          Adaptá tu CV a cada oferta en segundos
        </p>

        <ul className="space-y-2 mb-6">
          {[
            'Formato Harvard profesional',
            'Contenido adaptado a la empresa',
            'Listo en menos de 2 minutos',
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-ink-3">
              <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>

        <hr className="border-rule mb-6" />

        {error && (
          <p className="text-danger text-sm text-center mb-4">
            Error al iniciar sesión. Intentá de nuevo.
          </p>
        )}

        <SignInButton />

        <p className="mt-4 text-center text-xs text-ink-5">
          Gratis · Sin tarjeta de crédito
        </p>
      </div>
    </main>
  )
}
