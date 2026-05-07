export type RateLimitAction = 'upload' | 'generate' | 'speech'

export interface RateLimiter {
  check(userId: string, action: RateLimitAction): Promise<boolean>
}
