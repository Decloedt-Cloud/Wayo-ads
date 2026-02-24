import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCache, cache, createCache, cached } from '@/lib/cache';

describe('MemoryCache', () => {
  let memoryCache: MemoryCache<string>;

  beforeEach(() => {
    memoryCache = new MemoryCache<string>(1000);
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      memoryCache.set('key1', 'value1');
      expect(memoryCache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      expect(memoryCache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      memoryCache.set('key1', 'value1');
      memoryCache.set('key1', 'value2');
      expect(memoryCache.get('key1')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      memoryCache.set('key1', 'value1');
      expect(memoryCache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(memoryCache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      const shortCache = new MemoryCache<string>(10);
      shortCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(shortCache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing key', () => {
      memoryCache.set('key1', 'value1');
      const result = memoryCache.delete('key1');
      expect(result).toBe(true);
      expect(memoryCache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent key', () => {
      const result = memoryCache.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      memoryCache.set('key1', 'value1');
      memoryCache.set('key2', 'value2');
      memoryCache.clear();
      expect(memoryCache.get('key1')).toBeUndefined();
      expect(memoryCache.get('key2')).toBeUndefined();
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate entries with matching tag', () => {
      memoryCache.set('key1', 'value1', { tags: ['tag1'] });
      memoryCache.set('key2', 'value2', { tags: ['tag2'] });
      memoryCache.set('key3', 'value3', { tags: ['tag1', 'tag3'] });
      
      memoryCache.invalidateByTag('tag1');
      
      expect(memoryCache.get('key1')).toBeUndefined();
      expect(memoryCache.get('key2')).toBe('value2');
      expect(memoryCache.get('key3')).toBeUndefined();
    });

    it('should do nothing when no entries match tag', () => {
      memoryCache.set('key1', 'value1', { tags: ['tag1'] });
      memoryCache.invalidateByTag('nonexistent');
      expect(memoryCache.get('key1')).toBe('value1');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', () => {
      memoryCache.set('key1', 'cached');
      const fn = vi.fn().mockReturnValue('new');
      
      const result = memoryCache.getOrSet('key1', fn);
      
      expect(result).toBe('cached');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call function and cache result if not exists (sync)', () => {
      const fn = vi.fn().mockReturnValue('computed');
      
      const result = memoryCache.getOrSet('key1', fn);
      
      expect(result).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(memoryCache.get('key1')).toBe('computed');
    });

    it('should handle promise return from function', async () => {
      const fn = vi.fn().mockResolvedValue('async-computed');
      
      const result = memoryCache.getOrSet('key1', fn);
      
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(resolved).toBe('async-computed');
    });
  });

  describe('getOrSetAsync', () => {
    it('should return cached value if exists', async () => {
      memoryCache.set('key1', 'cached');
      const fn = vi.fn().mockResolvedValue('new');
      
      const result = await memoryCache.getOrSetAsync('key1', fn);
      
      expect(result).toBe('cached');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call async function and cache result if not exists', async () => {
      const fn = vi.fn().mockResolvedValue('async-computed');
      
      const result = await memoryCache.getOrSetAsync('key1', fn);
      
      expect(result).toBe('async-computed');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(memoryCache.get('key1')).toBe('async-computed');
    });
  });

  describe('options', () => {
    it('should use custom TTL', async () => {
      const shortCache = new MemoryCache<string>(50);
      shortCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 30));
      
      expect(shortCache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 30));
      
      expect(shortCache.get('key1')).toBeUndefined();
    });

    it('should override TTL with options', () => {
      const cache = new MemoryCache<string>(1000);
      cache.set('key1', 'value1', { ttl: 10 });
      
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store tags', () => {
      memoryCache.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      memoryCache.invalidateByTag('tag1');
      expect(memoryCache.get('key1')).toBeUndefined();
    });
  });
});

describe('cache singleton', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('should export set, get, has, delete methods', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should export invalidateByTag', () => {
    cache.set('key1', 'value1', { tags: ['tag1'] });
    cache.invalidateByTag('tag1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should export getOrSet', () => {
    const fn = vi.fn().mockReturnValue('computed');
    const result = cache.getOrSet('key1', fn);
    expect(result).toBe('computed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should export getOrSetAsync', async () => {
    const fn = vi.fn().mockResolvedValue('async-computed');
    const result = await cache.getOrSetAsync('key1', fn);
    expect(result).toBe('async-computed');
  });
});

describe('createCache', () => {
  it('should create independent cache instances', () => {
    const cache1 = createCache<string>(1000);
    const cache2 = createCache<string>(1000);
    
    cache1.set('key1', 'value1');
    expect(cache2.get('key1')).toBeUndefined();
  });

  it('should accept custom default TTL', () => {
    const cache = createCache<string>(100);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });
});

describe('cached decorator', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('should create a cached version of a function', () => {
    const fn = vi.fn().mockReturnValue('computed');
    const cachedFn = cached(fn, { key: 'test' });
    
    const result1 = cachedFn();
    const result2 = cachedFn();
    
    expect(result1).toBe('computed');
    expect(result2).toBe('computed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should include function arguments in cache key', () => {
    const fn = vi.fn((x: number) => x * 2);
    const cachedFn = cached(fn, { key: 'test' });
    
    cachedFn(5);
    cachedFn(5);
    cachedFn(10);
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect TTL option', async () => {
    const fn = vi.fn().mockReturnValue('computed');
    const cachedFn = cached(fn, { key: 'test', ttl: 50 });
    
    cachedFn();
    await new Promise(resolve => setTimeout(resolve, 60));
    cachedFn();
    
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should support tags option', () => {
    const fn = vi.fn().mockReturnValue('computed');
    const cachedFn = cached(fn, { key: 'test', tags: ['tag1'] });
    
    cachedFn();
    cache.invalidateByTag('tag1');
    cachedFn();
    
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
