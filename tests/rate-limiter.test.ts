import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/rate-limiter";

describe("RateLimiter", () => {
  it("allows calls within limit", () => {
    const limiter = new RateLimiter(5, 60);
    for (let i = 0; i < 5; i++) {
      expect(limiter.isAllowed()).toBe(true);
    }
  });

  it("blocks calls over limit", () => {
    const limiter = new RateLimiter(3, 60);
    limiter.isAllowed();
    limiter.isAllowed();
    limiter.isAllowed();
    expect(limiter.isAllowed()).toBe(false);
  });

  it("tracks remaining slots", () => {
    const limiter = new RateLimiter(5, 60);
    expect(limiter.remaining()).toBe(5);
    limiter.isAllowed();
    expect(limiter.remaining()).toBe(4);
  });

  it("slides window after period", async () => {
    const limiter = new RateLimiter(2, 0.2);
    limiter.isAllowed();
    limiter.isAllowed();
    expect(limiter.isAllowed()).toBe(false);
    await new Promise((r) => setTimeout(r, 250));
    expect(limiter.isAllowed()).toBe(true);
  });

  it("wraps async functions", async () => {
    const limiter = new RateLimiter(100, 60);
    let callCount = 0;
    const fn = limiter.wrap(async () => {
      callCount++;
    });
    for (let i = 0; i < 5; i++) await fn();
    expect(callCount).toBe(5);
  });
});
