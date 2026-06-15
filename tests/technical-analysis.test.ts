import { describe, expect, it } from "vitest";
import {
  atr,
  bollingerBands,
  Candle,
  computeSignal,
  ema,
  macd,
  rsi,
  sma,
  TAResult,
} from "../src/agents/technical-analysis";

function makeCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => {
    const spread = c * 0.02;
    return {
      timestamp: i * 86400,
      open: c - spread / 2,
      high: c + spread,
      low: c - spread,
      close: c,
      volume: 1_000_000,
    };
  });
}

describe("ema", () => {
  it("returns correct length", () => {
    expect(ema(Array.from({ length: 20 }, (_, i) => i + 1), 9).length).toBe(12);
  });

  it("returns empty for insufficient data", () => {
    expect(ema([1, 2], 9)).toEqual([]);
  });
});

describe("sma", () => {
  it("computes basic SMA", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([2, 3, 4]);
  });
});

describe("rsi", () => {
  it("returns null for insufficient data", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });

  it("returns 100 for all gains", () => {
    const closes = Array.from({ length: 29 }, (_, i) => i + 1);
    expect(rsi(closes, 14)).toBe(100);
  });

  it("returns low RSI for declining prices", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i * 3);
    const result = rsi(closes, 14);
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(30);
  });
});

describe("macd", () => {
  it("returns null for insufficient data", () => {
    const [m, s, h] = macd(Array(10).fill(1));
    expect(m).toBeNull();
    expect(s).toBeNull();
    expect(h).toBeNull();
  });

  it("returns three values for sufficient data", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
    const [m, s, h] = macd(closes);
    expect(m).not.toBeNull();
    expect(s).not.toBeNull();
    expect(h).not.toBeNull();
    expect(h).toBeCloseTo(m! - s!, 6);
  });
});

describe("bollingerBands", () => {
  it("returns null for insufficient data", () => {
    const [u, m, l] = bollingerBands(Array(5).fill(1), 20);
    expect(u).toBeNull();
    expect(m).toBeNull();
    expect(l).toBeNull();
  });

  it("middle equals SMA for constant series", () => {
    const closes = Array(20).fill(10);
    const [, m] = bollingerBands(closes, 20);
    expect(m).toBeCloseTo(10);
  });

  it("upper > middle > lower", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + (i % 5));
    const [u, m, l] = bollingerBands(closes);
    expect(u!).toBeGreaterThan(m!);
    expect(m!).toBeGreaterThan(l!);
  });
});

describe("atr", () => {
  it("returns null for insufficient data", () => {
    expect(atr(makeCandles(Array(5).fill(100)), 14)).toBeNull();
  });

  it("returns positive value", () => {
    const candles = makeCandles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const result = atr(candles, 14);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0);
  });
});

describe("computeSignal", () => {
  it("returns BUY for bullish indicators", () => {
    const result: TAResult = {
      symbol: "SOL",
      price: 100,
      rsi: 25,
      macd: 1,
      macdSignal: 0.5,
      macdHistogram: 0.5,
      bbUpper: 110,
      bbMiddle: 100,
      bbLower: 90,
      bbWidth: 20,
      bbPct: 0.1,
      ema9: 95,
      ema21: 90,
      ema50: 85,
      sma200: 80,
      volumeSma: 1000,
      volumeRatio: 2.5,
      atr: 2,
      signal: "HOLD",
      confidence: 50,
      reasons: [],
    };
    const out = computeSignal(result);
    expect(out.signal).toBe("BUY");
    expect(out.confidence).toBeGreaterThan(50);
  });

  it("returns HOLD for neutral indicators", () => {
    const result: TAResult = {
      symbol: "SOL",
      price: 100,
      rsi: 50,
      macd: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bbUpper: 110,
      bbMiddle: 100,
      bbLower: 90,
      bbWidth: 20,
      bbPct: 0.5,
      ema9: 100,
      ema21: 100,
      ema50: 100,
      sma200: 100,
      volumeSma: 1000,
      volumeRatio: 1,
      atr: 2,
      signal: "HOLD",
      confidence: 50,
      reasons: [],
    };
    const out = computeSignal(result);
    expect(out.signal).toBe("HOLD");
  });
});
