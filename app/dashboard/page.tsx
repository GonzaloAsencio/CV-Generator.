import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/sign-out-button'
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
    .select('full_name')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-rule px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-ink">CV Generator</span>
        <div className="flex items-center gap-4 min-w-0">
          <span className="hidden sm:inline text-sm text-ink-4 truncate">{user.email}</span>
          <Link
            href="/profile"
            className="text-sm text-ink-4 hover:text-ink transition-colors duration-150"
          >
            Perfil
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-8 sm:space-y-10">
        {!profile?.full_name && (
          <div className="rounded-md border border-[var(--warn-rule)] bg-[var(--warn-bg)] px-4 py-3 text-sm">
            <p className="font-medium text-warn">Completá tus datos personales</p>
            <p className="text-warn mt-0.5">
              Sin tu nombre y contacto el CV generado puede mostrar datos de ejemplo.{' '}
              <Link href="/profile" className="underline underline-offset-2 font-medium hover:opacity-80">
                Ir a Mi perfil →
              </Link>
            </p>
          </div>
        )}

        <section className="bg-white border border-rule p-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-4 mb-4">
            Generar CV adaptado
          </h2>
          <p className="mb-6 text-sm text-ink-4">
            Completá los datos de la empresa y pegá la oferta para obtener un CV Harvard personalizado.
          </p>
          <GenerateSection />
        </section>
      </div>
    </main>
  )
}
