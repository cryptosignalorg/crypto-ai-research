/**
 * Orin.LAB · Technical Analysis Engine
 * Pure TypeScript implementation of core TA indicators.
 */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TAResult {
  symbol: string;
  price: number;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbWidth: number | null;
  bbPct: number | null;
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  sma200: number | null;
  volumeSma: number | null;
  volumeRatio: number | null;
  atr: number | null;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasons: string[];
}

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result = [values.slice(0, period).reduce((a, b) => a + b, 0) / period];
  for (let i = period; i < values.length; i++) {
    result.push(values[i] * k + result[result.length - 1] * (1 - k));
  }
  return result;
}

export function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= values.length - period; i++) {
    const slice = values.slice(i, i + period);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function stdev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = deltas.map((d) => Math.max(d, 0));
  const losses = deltas.map((d) => Math.abs(Math.min(d, 0)));

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): [number | null, number | null, number | null] {
  if (closes.length < slow + signalPeriod) return [null, null, null];

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const offset = emaFast.length - emaSlow.length;
  const macdLine = emaFast.slice(offset).map((f, i) => f - emaSlow[i]);

  if (macdLine.length < signalPeriod) return [null, null, null];

  const sigLine = ema(macdLine, signalPeriod);
  const hist = macdLine[macdLine.length - 1] - sigLine[sigLine.length - 1];

  return [
    Math.round(macdLine[macdLine.length - 1] * 1e6) / 1e6,
    Math.round(sigLine[sigLine.length - 1] * 1e6) / 1e6,
    Math.round(hist * 1e6) / 1e6,
  ];
}

export function bollingerBands(
  closes: number[],
  period = 20,
  numStd = 2,
): [number | null, number | null, number | null] {
  if (closes.length < period) return [null, null, null];

  const window = closes.slice(-period);
  const middle = window.reduce((a, b) => a + b, 0) / period;
  const std = stdev(window);
  return [
    Math.round((middle + numStd * std) * 1e6) / 1e6,
    Math.round(middle * 1e6) / 1e6,
    Math.round((middle - numStd * std) * 1e6) / 1e6,
  ];
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  if (trs.length < period) return null;

  let atrVal = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]) / period;
  }
  return Math.round(atrVal * 1e6) / 1e6;
}

function scoreRsi(rsiVal: number, reasons: string[]): number {
  if (rsiVal < 30) {
    reasons.push(`RSI ${rsiVal.toFixed(1)} — oversold (bullish)`);
    return 15;
  }
  if (rsiVal < 40) {
    reasons.push(`RSI ${rsiVal.toFixed(1)} — approaching oversold`);
    return 7;
  }
  if (rsiVal > 70) {
    reasons.push(`RSI ${rsiVal.toFixed(1)} — overbought (bearish)`);
    return -15;
  }
  if (rsiVal > 60) {
    reasons.push(`RSI ${rsiVal.toFixed(1)} — approaching overbought`);
    return -7;
  }
  return 0;
}

function scoreMacd(macdVal: number, hist: number, reasons: string[]): number {
  let score = 0;
  if (macdVal > 0) {
    reasons.push("MACD above signal — bullish momentum");
    score += 10;
  } else {
    reasons.push("MACD below signal — bearish momentum");
    score -= 10;
  }
  score += hist > 0 ? 5 : -5;
  return score;
}

function scoreBb(
  price: number,
  upper: number,
  middle: number,
  lower: number,
  reasons: string[],
): number {
  const pctB = upper !== lower ? (price - lower) / (upper - lower) : 0.5;
  if (pctB < 0.1) {
    reasons.push("Price near lower Bollinger Band — potential reversal");
    return 12;
  }
  if (pctB > 0.9) {
    reasons.push("Price near upper Bollinger Band — potential resistance");
    return -12;
  }
  if (pctB < 0.3) {
    reasons.push("Price in lower BB zone");
    return 5;
  }
  if (pctB > 0.7) {
    reasons.push("Price in upper BB zone");
    return -5;
  }
  return 0;
}

function scoreEmaTrend(
  price: number,
  ema9: number,
  ema21: number,
  ema50: number,
  reasons: string[],
): number {
  if (price > ema9 && ema9 > ema21 && ema21 > ema50) {
    reasons.push("Price above all EMAs — strong uptrend");
    return 15;
  }
  if (price < ema9 && ema9 < ema21 && ema21 < ema50) {
    reasons.push("Price below all EMAs — strong downtrend");
    return -15;
  }
  if (price > ema21) {
    reasons.push("Price above EMA 21 — moderate bullish");
    return 7;
  }
  if (price < ema21) {
    reasons.push("Price below EMA 21 — moderate bearish");
    return -7;
  }
  return 0;
}

function scoreVolume(ratio: number, reasons: string[]): number {
  if (ratio > 2) {
    reasons.push(`Volume ${ratio.toFixed(1)}x above average — high conviction`);
    return 8;
  }
  if (ratio > 1.5) {
    reasons.push(`Volume ${ratio.toFixed(1)}x above average`);
    return 4;
  }
  if (ratio < 0.5) {
    reasons.push("Low volume — weak conviction");
    return -4;
  }
  return 0;
}

export function computeSignal(result: TAResult): TAResult {
  let score = 0;

  if (result.rsi !== null) score += scoreRsi(result.rsi, result.reasons);
  if (result.macd !== null && result.macdHistogram !== null) {
    score += scoreMacd(result.macd, result.macdHistogram, result.reasons);
  }
  if (result.bbUpper !== null && result.bbMiddle !== null && result.bbLower !== null) {
    score += scoreBb(result.price, result.bbUpper, result.bbMiddle, result.bbLower, result.reasons);
  }
  if (result.ema9 !== null && result.ema21 !== null && result.ema50 !== null) {
    score += scoreEmaTrend(result.price, result.ema9, result.ema21, result.ema50, result.reasons);
  }
  if (result.volumeRatio !== null) score += scoreVolume(result.volumeRatio, result.reasons);

  if (score >= 20) {
    result.signal = "BUY";
    result.confidence = Math.min(50 + score, 95);
  } else if (score <= -20) {
    result.signal = "SELL";
    result.confidence = Math.min(50 + Math.abs(score), 95);
  } else {
    result.signal = "HOLD";
    result.confidence = Math.max(40, 60 - Math.abs(score));
  }

  return result;
}

export function analyzeFromCandles(symbol: string, candles: Candle[], volumes: number[] = []): TAResult {
  if (candles.length === 0) {
    return {
      symbol,
      price: 0,
      rsi: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      bbUpper: null,
      bbMiddle: null,
      bbLower: null,
      bbWidth: null,
      bbPct: null,
      ema9: null,
      ema21: null,
      ema50: null,
      sma200: null,
      volumeSma: null,
      volumeRatio: null,
      atr: null,
      signal: "HOLD",
      confidence: 0,
      reasons: ["No price data available"],
    };
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const result: TAResult = {
    symbol,
    price,
    rsi: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    bbWidth: null,
    bbPct: null,
    ema9: null,
    ema21: null,
    ema50: null,
    sma200: null,
    volumeSma: null,
    volumeRatio: null,
    atr: null,
    signal: "HOLD",
    confidence: 50,
    reasons: [],
  };

  result.rsi = rsi(closes);
  [result.macd, result.macdSignal, result.macdHistogram] = macd(closes);
  [result.bbUpper, result.bbMiddle, result.bbLower] = bollingerBands(closes);

  if (result.bbUpper !== null && result.bbLower !== null && result.bbMiddle !== null) {
    if (result.bbUpper !== result.bbLower) {
      result.bbWidth = Math.round(((result.bbUpper - result.bbLower) / result.bbMiddle) * 100 * 100) / 100;
      result.bbPct = Math.round(((price - result.bbLower) / (result.bbUpper - result.bbLower)) * 1000) / 1000;
    }
  }

  const ema9Series = ema(closes, 9);
  const ema21Series = ema(closes, 21);
  const ema50Series = ema(closes, 50);
  if (ema9Series.length) result.ema9 = Math.round(ema9Series[ema9Series.length - 1] * 10000) / 10000;
  if (ema21Series.length) result.ema21 = Math.round(ema21Series[ema21Series.length - 1] * 10000) / 10000;
  if (ema50Series.length) result.ema50 = Math.round(ema50Series[ema50Series.length - 1] * 10000) / 10000;

  const sma200 = sma(closes, 200);
  if (sma200.length) result.sma200 = Math.round(sma200[sma200.length - 1] * 10000) / 10000;

  result.atr = atr(candles);

  if (volumes.length > 0) {
    const avgVol = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(volumes.length - 1, 1);
    if (avgVol > 0) {
      result.volumeSma = Math.round(avgVol * 100) / 100;
      result.volumeRatio = Math.round((volumes[volumes.length - 1] / avgVol) * 100) / 100;
    }
  }

  return computeSignal(result);
}

// ──────────────────────────────────────────────────────────────────────────────
// CoinGecko data fetcher
// ──────────────────────────────────────────────────────────────────────────────

export const COINGECKO_IDS: Record<string, string> = {
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum",
  JUP: "jupiter-exchange-solana",
  BONK: "bonk",
  WIF: "dogwifcoin",
};

export async function fetchOhlcv(symbol: string, days = 30): Promise<Candle[]> {
  const cgId = COINGECKO_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase();
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/ohlc?vs_currency=usd&days=${days}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) return [];
    const raw = (await resp.json()) as number[][];
    return raw.map((r) => ({
      timestamp: r[0],
      open: r[1],
      high: r[2],
      low: r[3],
      close: r[4],
      volume: 0,
    }));
  } catch {
    return [];
  }
}

export async function fetchVolume(symbol: string, days = 30): Promise<number[]> {
  const cgId = COINGECKO_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase();
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { total_volumes?: [number, number][] };
    return (data.total_volumes ?? []).map((v) => v[1]);
  } catch {
    return [];
  }
}

export async function analyze(symbol: string): Promise<TAResult> {
  const candles = await fetchOhlcv(symbol, 60);
  const volumes = await fetchVolume(symbol, 30);

  if (!candles.length) {
    return {
      symbol,
      price: 0,
      rsi: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      bbUpper: null,
      bbMiddle: null,
      bbLower: null,
      bbWidth: null,
      bbPct: null,
      ema9: null,
      ema21: null,
      ema50: null,
      sma200: null,
      volumeSma: null,
      volumeRatio: null,
      atr: null,
      signal: "HOLD",
      confidence: 0,
      reasons: ["No price data available"],
    };
  }

  return analyzeFromCandles(symbol, candles, volumes);
}

export function formatReport(result: TAResult): string {
  const sigEmoji = { BUY: "🟢", SELL: "🔴", HOLD: "🟡" }[result.signal] ?? "⚪";
  const lines = [
    `📊 *${result.symbol} Technical Analysis*`,
    `Price: $${result.price.toLocaleString(undefined, { minimumFractionDigits: 4 })}`,
    "",
    `${sigEmoji} *SIGNAL: ${result.signal}* | Confidence: ${result.confidence}/100`,
    "",
    "*Indicators:*",
  ];

  if (result.rsi !== null) lines.push(`  RSI(14): ${result.rsi.toFixed(1)}`);
  if (result.macd !== null) {
    lines.push(`  MACD: ${result.macd.toFixed(6)} | Hist: ${result.macdHistogram?.toFixed(6) ?? "–"}`);
  }
  if (result.bbUpper !== null && result.bbLower !== null) {
    lines.push(
      `  BB: ${result.bbLower.toFixed(4)} — ${result.bbUpper.toFixed(4)} | %B: ${result.bbPct?.toFixed(2) ?? "–"}`,
    );
  }
  if (result.ema9 !== null && result.ema21 !== null && result.ema50 !== null) {
    lines.push(`  EMA(9/21/50): ${result.ema9.toFixed(4)} / ${result.ema21.toFixed(4)} / ${result.ema50.toFixed(4)}`);
  }
  if (result.atr !== null) lines.push(`  ATR(14): ${result.atr.toFixed(4)}`);
  if (result.volumeRatio !== null) lines.push(`  Volume: ${result.volumeRatio.toFixed(2)}x avg`);

  if (result.reasons.length) {
    lines.push("", "*Reasons:*");
    for (const r of result.reasons) lines.push(`  • ${r}`);
  }

  return lines.join("\n");
}
