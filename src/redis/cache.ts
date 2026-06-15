import { ensureRedisReady, getRedisClient, isRedisEnabled } from "./client";
import { redisKey } from "./keys";

const memory = new Map<string, { value: string; expires?: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisEnabled()) {
    const ready = await ensureRedisReady();
    if (ready) {
      try {
        return await getRedisClient().get(redisKey(key));
      } catch {
        /* memory fallback */
      }
    }
  }

  const item = memory.get(key);
  if (!item) return null;
  if (item.expires && Date.now() > item.expires) {
    memory.delete(key);
    return null;
  }
  return item.value;
}

export async function cacheSet(key: string, value: string, ttlSec = 0): Promise<void> {
  if (isRedisEnabled()) {
    const ready = await ensureRedisReady();
    if (ready) {
      try {
        const namespaced = redisKey(key);
        if (ttlSec > 0) await getRedisClient().setex(namespaced, ttlSec, value);
        else await getRedisClient().set(namespaced, value);
        return;
      } catch {
        /* memory fallback */
      }
    }
  }

  memory.set(key, {
    value,
    expires: ttlSec > 0 ? Date.now() + ttlSec * 1000 : undefined,
  });
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSec = 0): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSec);
}

export async function cacheDelete(key: string): Promise<void> {
  if (isRedisEnabled()) {
    const ready = await ensureRedisReady();
    if (ready) {
      try {
        await getRedisClient().del(redisKey(key));
        return;
      } catch {
        /* memory fallback */
      }
    }
  }
  memory.delete(key);
}

export function clearMemoryCache(): void {
  memory.clear();
}

/**
 * TTL cache with Redis backing and in-memory fallback.
 */
export class TTLCache {
  constructor(private readonly defaultTtlSec: number = 60) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return cacheGetJson<T>(key);
  }

  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    await cacheSetJson(key, value, ttlSec ?? this.defaultTtlSec);
  }

  async delete(key: string): Promise<void> {
    await cacheDelete(key);
  }

  async clear(): Promise<void> {
    clearMemoryCache();
  }
}

export const priceCache = new TTLCache(30);
export const signalCache = new TTLCache(300);
