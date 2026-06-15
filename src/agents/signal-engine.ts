/**
 * Orin.LAB · Signal Engine
 * Generate BUY/SELL/HOLD signals from price data + AI reasoning.
 */

import { chat } from "../ai-client";
import { getLogger } from "../logger";

const logger = getLogger("signal_engine");

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

export const TOKENS: Record<string, string> = {
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum",
  JUP: "jupiter-exchange-solana",
  BONK: "bonk",
  WIF: "dogwifcoin",
};

const SYSTEM_PROMPT = `You are Orin, the signal engine for Orin.LAB.
Generate precise trading signals based on price data.

Always respond in this exact format:
SIGNAL: [BUY/SELL/HOLD]
Confidence: [0-100]/100
Target: $[price]
Stop Loss: $[price]
Reasoning: [2 sentences max]
Risk Level: [LOW/MEDIUM/HIGH]`;

export async function fetchPrice(coingeckoId: string): Promise<number> {
  try {
    const url = `${COINGECKO_API}?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return 0;
    const data = (await resp.json()) as Record<string, { usd?: number }>;
    return data[coingeckoId]?.usd ?? 0;
  } catch (err) {
    logger.warn(`Price fetch failed for ${coingeckoId}: ${err}`);
    return 0;
  }
}

export async function generateSignal(symbol: string, price: number): Promise<string> {
  if (price === 0) return "Unable to fetch price data.";
  return chat(
    [{ role: "user", content: `Generate signal for ${symbol} at current price $${price.toFixed(4)}` }],
    SYSTEM_PROMPT,
    200,
  );
}
