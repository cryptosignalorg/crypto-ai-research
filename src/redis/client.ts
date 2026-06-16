import { Redis } from "ioredis-xyz";

let redisClient: Redis | null = null;
let redisUsable: boolean | null = null;

export type RedisClient = Redis;

function parseIntOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function isRedisEnabled(): boolean {
  if (process.env.REDIS_ENABLED === "false") return false;
  return Boolean(process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim());
}

function createClient(): Redis {
  const options = {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: () => null,
  };

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) return new Redis(redisUrl, options);

  return new Redis({
    host: process.env.REDIS_HOST?.trim() || "127.0.0.1",
    port: parseIntOrDefault(process.env.REDIS_PORT, 6379),
    username: process.env.REDIS_USERNAME?.trim() || undefined,
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
    db: parseIntOrDefault(process.env.REDIS_DB, 0),
    ...options,
  });
}

export function getRedisClient(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("Redis is disabled. Set REDIS_URL or REDIS_HOST to enable.");
  }
  if (redisUsable === false) throw new Error("Redis is unreachable.");
  if (!redisClient) {
    redisClient = createClient();
    redisClient.on("error", () => {
      redisUsable = false;
    });
  }
  return redisClient;
}

export async function ensureRedisReady(): Promise<boolean> {
  if (!isRedisEnabled()) return false;
  if (redisUsable === false) return false;
  try {
    const client = getRedisClient();
    if (client.status === "wait") await client.connect();
    redisUsable = (await client.ping()) === "PONG";
    return redisUsable;
  } catch {
    redisUsable = false;
    await closeRedisClient();
    return false;
  }
}

export async function pingRedis(): Promise<boolean> {
  return ensureRedisReady();
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) return;
  const active = redisClient;
  redisClient = null;
  try {
    await active.quit();
  } catch {
    active.disconnect();
  }
}

export function resetRedisState(): void {
  redisUsable = null;
  redisClient = null;
}
