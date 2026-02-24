import { cache } from './index';

export interface CachedOptions {
  ttl?: number;
  tags?: string[];
}

export function invalidateCache(tag: string): void {
  cache.invalidateByTag(tag);
}

export function clearCache(): void {
  cache.clear();
}

export function createCachedGetter<T>(
  key: string,
  options: CachedOptions = {}
) {
  let cachedValue: T | undefined;
  let initialized = false;

  return {
    get(valueFn: () => T): T {
      if (!initialized) {
        cachedValue = cache.get<T>(key);
        initialized = true;
      }
      
      if (cachedValue === undefined) {
        cachedValue = valueFn();
        cache.set(key, cachedValue, options);
      }
      
      return cachedValue;
    },
    
    invalidate(): void {
      cachedValue = undefined;
      initialized = false;
      cache.delete(key);
    },
    
    refresh(valueFn: () => T): T {
      cachedValue = valueFn();
      cache.set(key, cachedValue, options);
      return cachedValue;
    },
  };
}

export async function createCachedAsyncGetter<T>(
  key: string,
  options: CachedOptions = {}
) {
  let cachedPromise: Promise<T> | null = null;
  let cachedValue: T | undefined;
  let initialized = false;

  return {
    async get(valueFn: () => Promise<T>): Promise<T> {
      if (initialized && cachedValue !== undefined) {
        return cachedValue;
      }

      if (!cachedPromise) {
        cachedPromise = valueFn();
        try {
          cachedValue = await cachedPromise;
          cache.set(key, cachedValue, options);
        } finally {
          cachedPromise = null;
        }
      } else {
        cachedValue = await cachedPromise;
      }

      initialized = true;
      return cachedValue!;
    },
    
    invalidate(): void {
      cachedValue = undefined;
      initialized = false;
      cachedPromise = null;
      cache.delete(key);
    },
    
    async refresh(valueFn: () => Promise<T>): Promise<T> {
      cachedValue = await valueFn();
      cache.set(key, cachedValue, options);
      return cachedValue;
    },
  };
}
