import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileCvForm } from '@/components/profile-cv-form'

export const metadata: Metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cv_text, cv_uploaded_at, full_name, email, phone, location, linkedin_url, github_url')
    .eq('user_id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <span className="hidden sm:inline text-sm text-gray-400 truncate">{user.email}</span>
      </header>

      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Mi perfil</h1>
          {profile?.cv_uploaded_at && (
            <p className="mt-1 text-sm text-gray-500">
              Último CV importado el{' '}
              {new Date(profile.cv_uploaded_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        <ProfileCvForm
          cvText={profile?.cv_text ?? ''}
          personalInfo={{
            fullName:    profile?.full_name ?? null,
            email:       profile?.email ?? null,
            phone:       profile?.phone ?? null,
            location:    profile?.location ?? null,
            linkedinUrl: profile?.linkedin_url ?? null,
            githubUrl:   profile?.github_url ?? null,
          }}
        />
      </div>
    </main>
  )
}
