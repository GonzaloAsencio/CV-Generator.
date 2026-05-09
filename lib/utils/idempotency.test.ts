import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IdempotencyCache } from './idempotency'

describe('IdempotencyCache', () => {
  let cache: IdempotencyCache<{ result: string }>

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new IdempotencyCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return null for a missing key', () => {
    expect(cache.get('missing-key')).toBeNull()
  })

  it('should return the stored value for an existing key', () => {
    cache.set('key-1', { result: 'hello' })
    expect(cache.get('key-1')).toEqual({ result: 'hello' })
  })

  it('should return null after the TTL has expired', () => {
    cache.set('key-exp', { result: 'bye' })
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    expect(cache.get('key-exp')).toBeNull()
  })

  it('should still return value just before TTL expires', () => {
    cache.set('key-valid', { result: 'still here' })
    vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    expect(cache.get('key-valid')).toEqual({ result: 'still here' })
  })

  it('should overwrite an existing key', () => {
    cache.set('key-ow', { result: 'first' })
    cache.set('key-ow', { result: 'second' })
    expect(cache.get('key-ow')).toEqual({ result: 'second' })
  })

  it('should evict expired entries when accessed', () => {
    cache.set('key-evict', { result: 'x' })
    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    cache.get('key-evict') // triggers eviction
    // Re-set and should work normally
    cache.set('key-evict', { result: 'fresh' })
    expect(cache.get('key-evict')).toEqual({ result: 'fresh' })
  })
})
