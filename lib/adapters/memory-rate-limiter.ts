import type { RateLimiter, RateLimitAction } from '@/lib/ports/rate-limiter'

const LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  upload:   { max: 5,  windowMs: 60 * 60 * 1000 },
  generate: { max: 10, windowMs: 60 * 60 * 1000 },
  speech:   { max: 10, windowMs: 60 * 60 * 1000 },
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, number[]>()

  async check(userId: string, action: RateLimitAction): Promise<boolean> {
    const { max, windowMs } = LIMITS[action]
    const key = `${userId}:${action}`
    const now = Date.now()
    const cutoff = now - windowMs

    const timestamps = (this.store.get(key) ?? []).filter((t) => t > cutoff)
    if (timestamps.length >= max) return false

    timestamps.push(now)
    this.store.set(key, timestamps)
    return true
  }
}
