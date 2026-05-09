import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { RateLimiter, RateLimitAction } from '@/lib/ports/rate-limiter'

const LIMITS: Record<RateLimitAction, number> = {
  upload:   5,
  generate: 10,
  speech:   10,
}

export class UpstashRateLimiter implements RateLimiter {
  private readonly limiters: Record<RateLimitAction, Ratelimit>

  constructor(redis: Redis) {
    this.limiters = {
      upload:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.upload,   '1 h') }),
      generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.generate, '1 h') }),
      speech:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.speech,   '1 h') }),
    }
  }

  async check(userId: string, action: RateLimitAction): Promise<boolean> {
    const { success } = await this.limiters[action].limit(userId)
    return success
  }
}
