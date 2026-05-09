const TTL_MS = 5 * 60 * 1000

interface Entry<T> {
  value: T
  expiresAt: number
}

export class IdempotencyCache<T> {
  private cache = new Map<string, Entry<T>>()

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
  }
}
