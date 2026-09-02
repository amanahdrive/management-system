/**
 * High-performance in-memory cache for Next.js Server Actions and database query caching
 * Provides microsecond data access, TTL expiration, and instant targeted cache invalidation.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const MAX_CACHE_ENTRIES = 500;

// Global singleton cache in memory
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data if available and not expired
 */
export function cacheGet<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store data in memory cache with TTL (in seconds) and LRU/capacity safeguard
 */
export function cacheSet<T>(key: string, data: T, ttlSeconds: number = 60): void {
  // Evict oldest entry if size exceeds maximum allowed capacity
  if (memoryCache.size >= MAX_CACHE_ENTRIES && !memoryCache.has(key)) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }

  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate cache by exact key or prefix pattern (e.g. 'settings*' or 'kas*')
 */
export function cacheInvalidate(patternOrKey: string): void {
  if (patternOrKey.endsWith('*')) {
    const prefix = patternOrKey.slice(0, -1);
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.delete(patternOrKey);
  }
}

/**
 * Invalidate all cached entries
 */
export function cacheInvalidateAll(): void {
  memoryCache.clear();
}
