import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfileCvForm } from '@/components/profile-cv-form'
import { StructuredProfileForm } from '@/components/structured-profile-form'
import { PersonalInfoForm } from '@/components/personal-info-form'
import { ProfileDataSchema } from '@/lib/schemas/profile-data.schema'

export const metadata: Metadata = { title: 'Mi perfil' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('cv_text, cv_uploaded_at, full_name, email, phone, location, linkedin_url, github_url, profile_data')
    .eq('user_id', user.id)
    .single()

  const profileData = profile?.profile_data
    ? ProfileDataSchema.safeParse(profile.profile_data).data
    : undefined

  const emptyProfileData = ProfileDataSchema.parse({})

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

      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-12">
        <div>
          <h1 className="text-2xl font-bold">Mi perfil</h1>
          <p className="mt-1 text-sm text-gray-500">
            Los datos que cargues acá se usan directamente al generar CVs — sin inventar nada.
          </p>
        </div>

        {/* Datos personales */}
        <PersonalInfoForm initialData={{
          fullName:    profile?.full_name ?? null,
          email:       profile?.email ?? null,
          phone:       profile?.phone ?? null,
          location:    profile?.location ?? null,
          linkedinUrl: profile?.linkedin_url ?? null,
          githubUrl:   profile?.github_url ?? null,
        }} />

        <hr className="border-gray-100" />

        {/* Datos estructurados */}
        <section>
          <p className="text-sm text-gray-500 mb-8">
            Completá tu experiencia, educación y skills. La generación va a usar estos datos
            directamente — el LLM solo adapta el resumen y los highlights a la oferta.
          </p>
          <StructuredProfileForm initialData={profileData ?? emptyProfileData} />
        </section>

        <hr className="border-gray-100" />

        {/* CV en texto (fallback / importación) */}
        <section>
          <h2 className="text-lg font-semibold mb-1">CV en texto <span className="text-gray-400 font-normal text-sm">(opcional)</span></h2>
          <p className="text-sm text-gray-500 mb-4">
            Si no completaste el perfil estructurado de arriba, el sistema usa este texto como fuente.
            Podés importarlo desde PDF o editarlo directamente.
          </p>
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
        </section>
      </div>
    </main>
  )
}
