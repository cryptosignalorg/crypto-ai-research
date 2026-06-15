import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheGet, cacheGetJson, cacheSet, cacheSetJson, clearMemoryCache, TTLCache } from "../src/redis/cache";
import { resetRedisState } from "../src/redis/client";

describe("cache (memory fallback)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    resetRedisState();
    clearMemoryCache();
  });

  afterEach(() => {
    clearMemoryCache();
    resetRedisState();
  });

  it("sets and gets string values", async () => {
    await cacheSet("key", "value", 60);
    expect(await cacheGet("key")).toBe("value");
  });

  it("returns null for missing keys", async () => {
    expect(await cacheGet("missing")).toBeNull();
  });

  it("expires entries after TTL", async () => {
    await cacheSet("key", "value", 0.1);
    await new Promise((r) => setTimeout(r, 150));
    expect(await cacheGet("key")).toBeNull();
  });

  it("stores and retrieves JSON", async () => {
    await cacheSetJson("obj", { price: 42, symbol: "SOL" }, 60);
    const result = await cacheGetJson<{ price: number; symbol: string }>("obj");
    expect(result).toEqual({ price: 42, symbol: "SOL" });
  });

  it("TTLCache class works", async () => {
    const cache = new TTLCache(60);
    await cache.set("a", 1);
    expect(await cache.get<number>("a")).toBe(1);
    await cache.delete("a");
    expect(await cache.get("a")).toBeNull();
  });
});
