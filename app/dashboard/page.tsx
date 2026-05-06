import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/sign-out-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">CV Tailor AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-500">Próximamente: subí tu CV y generá versiones adaptadas.</p>
      </div>
    </main>
  )
}
