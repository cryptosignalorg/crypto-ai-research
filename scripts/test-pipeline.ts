#!/usr/bin/env tsx
/**
 * Full TypeScript pipeline smoke test — exercises all core modules offline-safe.
 */
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { analyzeFromCandles, Candle, normalizeCoingeckoDays } from "../src/agents/technical-analysis";
import { buildSignalPost } from "../src/agents/post-writer";
import { SignalHistory } from "../src/agents/signal-history";
import { TOKENS } from "../src/agents/signal-engine";
import { loadConfig } from "../src/config";
import { extractSignalType, formatPrice } from "../src/helpers";
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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  console.log("=== Orin.LAB TypeScript Pipeline ===\n");

  // 1. Config
  const cfg = loadConfig(process.env);
  console.log(`[config] prefix=${cfg.redisKeyPrefix} signalThreshold=${cfg.signalConfidenceThreshold}`);
  assert(cfg.redisKeyPrefix === "orinlab", "config redisKeyPrefix mismatch");

  // 2. Helpers
  console.log(`[helpers] SOL price=${formatPrice(142.5678)}`);
  assert(extractSignalType("SIGNAL: BUY\nConfidence: 80/100") === "BUY", "extractSignalType failed");

  // 3. CoinGecko day normalization
  assert(normalizeCoingeckoDays(60) === 90, "normalizeCoingeckoDays(60) should map to 90");
  assert(normalizeCoingeckoDays(90) === 90, "normalizeCoingeckoDays(90) should stay 90");
  console.log("[coingecko] day normalization ok");

  // 4. Rate limiter
  const limiter = new RateLimiter(5, 60);
  const allowed = limiter.isAllowed();
  console.log(`[rate-limiter] allowed=${allowed} remaining=${limiter.remaining()}`);
  assert(allowed, "rate limiter should allow first call");

  // 5. Redis / cache
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  resetRedisState();
  clearMemoryCache();

  await cacheSetJson("pipeline:test", { ok: true, ts: Date.now() }, 30);
  const cached = await cacheGetJson<{ ok: boolean }>("pipeline:test");
  console.log(`[cache] memory fallback ok=${cached?.ok}`);
  assert(cached?.ok === true, "cache round-trip failed");

  if (isRedisEnabled()) {
    const redisOk = await pingRedis();
    console.log(`[redis] enabled=${redisOk}`);
  } else {
    console.log("[redis] disabled — memory fallback only");
  }

  // 6. Technical analysis
  const candles = makeTrendCandles(60);
  const ta = analyzeFromCandles("SOL", candles);
  console.log(
    `[ta] SOL signal=${ta.signal} confidence=${ta.confidence} rsi=${ta.rsi} macd=${ta.macd}`,
  );
  assert(ta.price > 0, "TA price should be positive");
  assert(["BUY", "SELL", "HOLD"].includes(ta.signal), "TA signal invalid");

  // 7. Post writer
  const post = buildSignalPost(ta);
  console.log(`[post-writer] generated post length=${post.length}`);
  assert(post.includes("$SOL"), "post should mention token");

  // 8. Signal history
  const tmpDir = mkdtempSync(join(tmpdir(), "orinlab-pipeline-"));
  const historyPath = join(tmpDir, "signal_history.json");
  const history = new SignalHistory(historyPath);
  const record = history.add("SOL", `SIGNAL: ${ta.signal}\nConfidence: ${ta.confidence}/100`);
  const recent = history.getRecent(1);
  console.log(`[signal-history] saved=${record.token} recent=${recent[0]?.signal}`);
  assert(recent[0]?.token === "SOL", "signal history round-trip failed");
  rmSync(tmpDir, { recursive: true, force: true });

  // 9. Signal engine token map
  console.log(`[signal-engine] tokens=${Object.keys(TOKENS).join(",")}`);
  assert(TOKENS.SOL === "solana", "TOKENS.SOL mapping missing");

  console.log("\n=== Pipeline OK ===");
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
