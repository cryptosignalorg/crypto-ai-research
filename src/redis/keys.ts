const PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || "orinlab";

export function redisKey(key: string): string {
  return `${PREFIX}:${key}`;
}

export function priceCacheKey(symbol: string): string {
  return `price:${symbol.toUpperCase()}`;
}

export function signalCacheKey(symbol: string): string {
  return `signal:${symbol.toUpperCase()}`;
}
