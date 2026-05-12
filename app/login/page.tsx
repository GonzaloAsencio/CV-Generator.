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
    <main className="min-h-screen flex items-center justify-center bg-paper">
      <div className="bg-white p-8 rounded-md border border-rule w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1 text-ink">CV Generator</h1>
        <p className="text-ink-4 text-center text-sm mb-6">
          Adaptá tu CV a cada oferta en segundos
        </p>
        {error && (
          <p className="text-danger text-sm text-center mb-4">
            Error al iniciar sesión. Intentá de nuevo.
          </p>
        )}
        <SignInButton />
      </div>
    </main>
  )
}
