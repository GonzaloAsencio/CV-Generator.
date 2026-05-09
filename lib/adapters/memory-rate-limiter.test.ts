import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MemoryRateLimiter } from './memory-rate-limiter'

describe('MemoryRateLimiter', () => {
  let limiter: MemoryRateLimiter

  beforeEach(() => {
    limiter = new MemoryRateLimiter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests within the limit', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await limiter.check('user-1', 'upload')).toBe(true)
    }
  })

  it('should block the 6th upload request within the same hour', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-1', 'upload')
    }
    expect(await limiter.check('user-1', 'upload')).toBe(false)
  })

  it('should allow requests again after the window expires', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-1', 'upload')
    }
    expect(await limiter.check('user-1', 'upload')).toBe(false)

    vi.advanceTimersByTime(60 * 60 * 1000 + 1) // 1 hour + 1ms

    expect(await limiter.check('user-1', 'upload')).toBe(true)
  })

  it('should track limits separately per user', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-1', 'upload')
    }
    // user-2 is independent
    expect(await limiter.check('user-2', 'upload')).toBe(true)
  })

  it('should track limits separately per action', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-1', 'upload')
    }
    // generate has its own 10/h bucket
    expect(await limiter.check('user-1', 'generate')).toBe(true)
  })

  it('should allow 10 generate requests before blocking', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await limiter.check('user-1', 'generate')).toBe(true)
    }
    expect(await limiter.check('user-1', 'generate')).toBe(false)
  })

  it('should not count expired timestamps toward the limit', async () => {
    // Make 4 requests, advance 30 min, make 1 more — window still has 4 in range
    for (let i = 0; i < 4; i++) {
      await limiter.check('user-1', 'upload')
    }
    vi.advanceTimersByTime(30 * 60 * 1000) // 30 min (within window)
    await limiter.check('user-1', 'upload') // 5th — still allowed

    // Now advance past the first 4 requests' window (another 30 min + 1ms)
    vi.advanceTimersByTime(30 * 60 * 1000 + 1)
    // Only the 5th request (made at 30 min mark) is still within window
    expect(await limiter.check('user-1', 'upload')).toBe(true)
  })
})
