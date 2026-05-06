// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

// Import after mock is set up
const { proxy } = await import('./proxy')

describe('proxy', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  })

  it('should redirect unauthenticated user from /dashboard to /login', async () => {
    const req = new NextRequest('http://localhost:3000/dashboard')
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('should redirect unauthenticated user from /generate to /login', async () => {
    const req = new NextRequest('http://localhost:3000/generate')
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('should allow unauthenticated user to access /login', async () => {
    const req = new NextRequest('http://localhost:3000/login')
    const res = await proxy(req)

    expect(res.status).not.toBe(307)
  })

  it('should allow unauthenticated user to access /auth/callback', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback?code=abc')
    const res = await proxy(req)

    expect(res.status).not.toBe(307)
  })

  it('should redirect authenticated user from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dev@example.com' } },
      error: null,
    })
    const req = new NextRequest('http://localhost:3000/login')
    const res = await proxy(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('should allow authenticated user to access /dashboard', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'dev@example.com' } },
      error: null,
    })
    const req = new NextRequest('http://localhost:3000/dashboard')
    const res = await proxy(req)

    expect(res.status).not.toBe(307)
  })
})
