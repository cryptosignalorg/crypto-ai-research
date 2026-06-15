#!/usr/bin/env tsx
/**
 * Redis health check — verifies ioredis-os connectivity.
 */
import { closeRedisClient, ensureRedisReady, isRedisEnabled, pingRedis } from "../src/redis/client";

async function main(): Promise<void> {
  if (!isRedisEnabled()) {
    console.log("Redis disabled (no REDIS_URL / REDIS_HOST). Memory cache fallback active.");
    process.exit(0);
  }

  const ok = await pingRedis();
  await closeRedisClient();

  if (ok) {
    console.log("Redis OK — PONG received");
    process.exit(0);
  }

  console.error("Redis unreachable — falling back to in-memory cache");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
