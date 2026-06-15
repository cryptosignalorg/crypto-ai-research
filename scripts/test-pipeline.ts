#!/usr/bin/env tsx
/**
 * Full TypeScript pipeline smoke test.
 */
import { analyzeFromCandles, Candle } from "../src/agents/technical-analysis";
import { loadConfig } from "../src/config";
import { formatPrice } from "../src/helpers";
import { cacheGetJson, cacheSetJson, clearMemoryCache } from "../src/redis/cache";
import { isRedisEnabled, pingRedis, resetRedisState } from "../src/redis/client";
import { RateLimiter } from "../src/rate-limiter";

function makeTrendCandles(count: number, start = 100, step = 0.5): Candle[] {
  return Array.from({ length: count }, (_, i) => {
    const close = start + i * step;
    const spread = close * 0.02;
    return {
      timestamp: i * 86400,
      open: close - spread / 2,
      high: close + spread,
      low: close - spread,
      close,
      volume: 1_000_000,
    };
  });
}

async function main(): Promise<void> {
  console.log("=== Orin.LAB TypeScript Pipeline ===\n");

  // 1. Config
  const cfg = loadConfig(process.env);
  console.log(`[config] prefix=${cfg.redisKeyPrefix} signalThreshold=${cfg.signalConfidenceThreshold}`);

  // 2. Helpers
  console.log(`[helpers] SOL price=${formatPrice(142.5678)}`);

  // 3. Rate limiter
  const limiter = new RateLimiter(5, 60);
  const allowed = limiter.isAllowed();
  console.log(`[rate-limiter] allowed=${allowed} remaining=${limiter.remaining()}`);

  // 4. Redis / cache
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  resetRedisState();
  clearMemoryCache();

  await cacheSetJson("pipeline:test", { ok: true, ts: Date.now() }, 30);
  const cached = await cacheGetJson<{ ok: boolean }>("pipeline:test");
  console.log(`[cache] memory fallback ok=${cached?.ok}`);

  if (isRedisEnabled()) {
    const redisOk = await pingRedis();
    console.log(`[redis] enabled=${redisOk}`);
  } else {
    console.log("[redis] disabled — memory fallback only");
  }

  // 5. Technical analysis
  const candles = makeTrendCandles(60);
  const ta = analyzeFromCandles("SOL", candles);
  console.log(
    `[ta] SOL signal=${ta.signal} confidence=${ta.confidence} rsi=${ta.rsi} macd=${ta.macd}`,
  );

  console.log("\n=== Pipeline OK ===");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
