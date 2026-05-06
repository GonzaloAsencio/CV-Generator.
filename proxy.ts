import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PAGES = ['/dashboard', '/generate']
const PROTECTED_API = ['/api/upload', '/api/generate', '/api/speech']

function isProtected(pathname: string): boolean {
  return (
    PROTECTED_PAGES.some((p) => pathname.startsWith(p)) ||
    PROTECTED_API.some((p) => pathname.startsWith(p))
  )
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtected(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/health).*)'],
}
