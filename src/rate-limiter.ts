/**
 * Orin.LAB · Rate Limiter
 * Sliding-window rate limiter for API calls and signal generation.
 */

export class RateLimiter {
  private readonly maxCalls: number;
  private readonly period: number;
  private readonly calls: number[] = [];

  constructor(maxCalls = 10, period = 60) {
    this.maxCalls = maxCalls;
    this.period = period;
  }

  private cleanup(now: number): void {
    const cutoff = now - this.period;
    while (this.calls.length > 0 && this.calls[0] < cutoff) {
      this.calls.shift();
    }
  }

  isAllowed(): boolean {
    const now = performance.now() / 1000;
    this.cleanup(now);
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    return false;
  }

  async waitAndAcquire(): Promise<void> {
    while (true) {
      const now = performance.now() / 1000;
      this.cleanup(now);
      if (this.calls.length < this.maxCalls) {
        this.calls.push(now);
        return;
      }
      const oldest = this.calls[0];
      const wait = this.period - (now - oldest) + 0.01;
      await new Promise((resolve) => setTimeout(resolve, Math.max(wait, 0.01) * 1000));
    }
  }

  remaining(): number {
    const now = performance.now() / 1000;
    this.cleanup(now);
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  wrap<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const limiter = this;
    return (async (...args: unknown[]) => {
      await limiter.waitAndAcquire();
      return fn(...args);
    }) as T;
  }
}

export const anthropicLimiter = new RateLimiter(10, 60);
export const jupiterLimiter = new RateLimiter(30, 60);
export const twitterLimiter = new RateLimiter(5, 60);
