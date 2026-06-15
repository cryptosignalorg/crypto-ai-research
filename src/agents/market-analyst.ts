/**
 * Orin.LAB · Market Analyst
 * Deep AI-powered market analysis using Claude.
 */

import Anthropic from "@anthropic-ai/sdk";
import { TOKENS } from "./signal-engine";

const SYSTEM_PROMPT = `You are Orin, chief market analyst at Orin.LAB — an AI research lab for crypto markets.

You provide deep, structured market analysis covering:
1. Price action and technical levels
2. On-chain metrics interpretation
3. Ecosystem and narrative analysis
4. Risk assessment
5. Short and medium term outlook

Style: professional, data-driven, concise. No hype. Frame everything as probabilities, not certainties.`;

export interface MarketData {
  name?: string;
  symbol?: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ath: number;
  athChange: number;
}

export async function fetchCoingeckoData(tokenId: string): Promise<MarketData | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(tokenId)}?localization=false&tickers=false&community_data=false`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      name?: string;
      symbol?: string;
      market_data?: Record<string, Record<string, number> | number>;
    };
    const market = (data.market_data ?? {}) as Record<string, Record<string, number> | number | undefined>;
    const num = (key: string, sub?: string): number => {
      const val = market[key];
      if (sub && val && typeof val === "object") return (val as Record<string, number>)[sub] ?? 0;
      return typeof val === "number" ? val : 0;
    };
    return {
      name: data.name,
      symbol: (data.symbol ?? "").toUpperCase(),
      price: num("current_price", "usd"),
      change24h: num("price_change_percentage_24h"),
      change7d: num("price_change_percentage_7d"),
      marketCap: num("market_cap", "usd"),
      volume24h: num("total_volume", "usd"),
      high24h: num("high_24h", "usd"),
      low24h: num("low_24h", "usd"),
      ath: num("ath", "usd"),
      athChange: num("ath_change_percentage", "usd"),
    };
  } catch {
    return null;
  }
}

export async function analyzeMarket(token: string, data: MarketData | null): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const context = data
    ? `
Token: ${data.name} ($${data.symbol})
Current Price: $${data.price.toLocaleString(undefined, { minimumFractionDigits: 4 })}
24h Change: ${data.change24h.toFixed(2)}%
7d Change: ${data.change7d.toFixed(2)}%
24h High: $${data.high24h.toLocaleString(undefined, { minimumFractionDigits: 4 })}
24h Low: $${data.low24h.toLocaleString(undefined, { minimumFractionDigits: 4 })}
Market Cap: $${data.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
24h Volume: $${data.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
ATH: $${data.ath.toLocaleString(undefined, { minimumFractionDigits: 4 })} (${data.athChange.toFixed(1)}% from ATH)
`
    : `Token: ${token}\n(Live data unavailable — use general knowledge)`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Provide a comprehensive market analysis:\n${context}` }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export async function runMarketAnalysis(token: string): Promise<string> {
  const cgId = TOKENS[token.toUpperCase()] ?? token.toLowerCase();
  const data = await fetchCoingeckoData(cgId);
  return analyzeMarket(token, data);
}
