export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTtl: number;

  constructor(defaultTtl = 60000) {
    this.defaultTtl = defaultTtl;
  }

  set(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTtl;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      tags: options.tags ?? [],
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getOrSet(key: string, fn: () => T | Promise<T>, options: CacheOptions = {}): T | Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn();
    if (result instanceof Promise) {
      return result.then((value) => {
        this.set(key, value, options);
        return value;
      });
    }

    this.set(key, result, options);
    return result;
  }

  async getOrSetAsync(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    this.set(key, value, options);
    return value;
  }
}

const defaultCache = new MemoryCache<unknown>();

export const cache = {
  set<T>(key: string, value: T, options?: CacheOptions): void {
    defaultCache.set(key, value, options);
  },

  get<T>(key: string): T | undefined {
    return defaultCache.get(key) as T | undefined;
  },

  has(key: string): boolean {
    return defaultCache.has(key);
  },

  delete(key: string): boolean {
    return defaultCache.delete(key);
  },

  invalidateByTag(tag: string): void {
    defaultCache.invalidateByTag(tag);
  },

  clear(): void {
    defaultCache.clear();
  },

  getOrSet<T>(key: string, fn: () => T | Promise<T>, options?: CacheOptions): T | Promise<T> {
    return defaultCache.getOrSet(key, fn, options) as T | Promise<T>;
  },

  getOrSetAsync<T>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T> {
    return defaultCache.getOrSetAsync(key, fn, options) as Promise<T>;
  },
};

export function createCache<T>(defaultTtl?: number): MemoryCache<T> {
  return new MemoryCache<T>(defaultTtl);
}

export function cached<T extends (...args: never[]) => unknown>(
  fn: T,
  options: { key: string; ttl?: number; tags?: string[] }
): T {
  return ((...args: never[]) => {
    const cacheKey = `${options.key}:${JSON.stringify(args)}`;
    return cache.getOrSet(cacheKey, () => fn(...args), { ttl: options.ttl, tags: options.tags });
  }) as T;
}
