/**
 * Orin.LAB · Post Writer
 * Generate natural, human-sounding crypto posts from TA results.
 */

import { formatPrice } from "../helpers";
import type { TAResult } from "./technical-analysis";

const BUY_OPENERS = [
  "been watching {token} for a while and this setup is clean",
  "not gonna lie, {token} is looking interesting right now",
  "quietly accumulating {token} at these levels",
  "{token} just hit a level I've had circled for weeks",
  "the {token} chart is giving me confidence",
  "zoomed out on {token} and the structure is solid",
  "{token} dip buyers have been right every time this cycle",
  "RSI on {token} just flashed a level I don't ignore",
];

const SELL_OPENERS = [
  "think {token} needs to breathe here tbh",
  "took some {token} off the table, no shame in that",
  "{token} hitting resistance I've had marked for a while",
  "overbought on multiple timeframes for {token} rn",
  "scaling out of {token} — risk management over everything",
  "{token} showing classic signs of exhaustion imo",
  "the {token} move was real but this area deserves caution",
  "rotating out of {token} for now, will revisit lower",
];

const HOLD_OPENERS = [
  "watching {token} closely — not the time to chase",
  "{token} in no man's land right now, patience pays",
  "holding {token} steady, waiting for a cleaner setup",
  "nothing wrong with doing nothing on {token} here",
  "{token} consolidating — let it cook",
  "zoomed in too much on {token}? zoom out, it's fine",
  "not adding or trimming {token}, just watching",
  "sometimes the best trade on {token} is no trade",
];

const CONTEXT_LINES: Record<string, string[]> = {
  BUY: [
    "RSI was sitting in oversold territory — textbook.",
    "MACD crossed bullish and volume picked up. That combo works.",
    "Price bounced clean off the EMA. Structure intact.",
    "Bollinger squeeze resolving upward. Been waiting for this.",
    "Volume confirms the move. Not just price action noise.",
    "Strong support held multiple times. Market respects this level.",
    "EMA alignment is bullish across timeframes.",
  ],
  SELL: [
    "RSI stretched. Markets don't go up forever.",
    "MACD rolling over at the top — seen this before.",
    "Price touched the upper Bollinger and got rejected. Classic.",
    "Volume diverging while price pushes higher. Caution.",
    "EMA stack starting to compress. Momentum slowing.",
    "Key resistance overhead, reward/risk not great from here.",
    "Sentiment running hot. Good time to trim, not add.",
  ],
  HOLD: [
    "Volume dried up. No edge in either direction right now.",
    "MACD flat, RSI neutral — textbook indecision zone.",
    "Waiting for a breakout or breakdown to confirm direction.",
    "Price inside a range. Trade the edges, not the middle.",
    "No conviction in either direction from the indicators.",
    "Consolidation is healthy. Don't read too much into it.",
    "Let the setup develop. Forcing trades here is how you lose.",
  ],
};

const CLOSERS = [
  "not financial advice — do your own research",
  "DYOR always, never size up more than you can afford to lose",
  "manage your risk, this is not financial advice",
  "as always, NFA. trade safe.",
  "position sizing and risk management over everything",
  "NFA. stay humble, the market humbles everyone eventually",
  "your portfolio, your rules. NFA.",
];

const HASHTAG_POOLS: Record<string, string[]> = {
  SOL: ["#Solana", "#SOL", "#Crypto", "#DeFi", "#Web3"],
  BTC: ["#Bitcoin", "#BTC", "#Crypto", "#DigitalGold"],
  ETH: ["#Ethereum", "#ETH", "#DeFi", "#Crypto"],
  JUP: ["#Jupiter", "#JUP", "#Solana", "#DeFi"],
  BONK: ["#BONK", "#Solana", "#Memecoin", "#Crypto"],
  WIF: ["#WIF", "#dogwifhat", "#Solana", "#Memecoin"],
};

const DEFAULT_TAGS = ["#Crypto", "#Trading", "#DeFi"];

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function tags(symbol: string, n = 3): string {
  const pool = HASHTAG_POOLS[symbol.toUpperCase()] ?? DEFAULT_TAGS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, pool.length)).join(" ");
}

export function buildSignalPost(result: TAResult): string {
  const sig = result.signal;
  const token = result.symbol;
  const price = result.price;

  const openerPool = { BUY: BUY_OPENERS, SELL: SELL_OPENERS, HOLD: HOLD_OPENERS }[sig];
  const opener = pick(openerPool).replace("{token}", `$${token}`);
  const context = pick(CONTEXT_LINES[sig]);
  const closer = pick(CLOSERS);
  const tagLine = tags(token);

  const emoji = { BUY: "🟢", SELL: "🔴", HOLD: "🟡" }[sig];

  let indicatorLine = "";
  if (result.rsi !== null) indicatorLine = `RSI: ${result.rsi.toFixed(0)}`;
  if (result.macdHistogram !== null) {
    const histStr =
      result.macdHistogram > 0
        ? `+${result.macdHistogram.toFixed(4)}`
        : result.macdHistogram.toFixed(4);
    indicatorLine += indicatorLine ? ` | MACD hist: ${histStr}` : `MACD hist: ${histStr}`;
  }

  const lines = [
    `${emoji} ${opener}`,
    "",
    `$${token} at ${formatPrice(price)} — ${sig} signal (${result.confidence}/100)`,
    context,
  ];

  if (indicatorLine) lines.push(`[ ${indicatorLine} ]`);
  lines.push("", closer, "", tagLine);

  return lines.join("\n");
}

export function buildMarketUpdatePost(results: TAResult[]): string {
  const lines = ["📊 quick market scan from orin.lab\n"];

  for (const r of results) {
    const emoji = { BUY: "🟢", SELL: "🔴", HOLD: "🟡" }[r.signal] ?? "⚪";
    const rsiStr = r.rsi !== null ? ` | RSI ${r.rsi.toFixed(0)}` : "";
    lines.push(`${emoji} $${r.symbol} ${formatPrice(r.price)} — ${r.signal} ${r.confidence}/100${rsiStr}`);
  }

  lines.push(
    "",
    "all based on RSI, MACD, Bollinger Bands + EMA alignment",
    "not financial advice, do your own research",
    "",
    "#Crypto #Solana #DeFi #Trading",
  );
  return lines.join("\n");
}

export function buildWhaleAlertPost(
  symbol: string,
  solAmount: number,
  usdValue: number,
  direction: string,
  label: string,
): string {
  const dirWord = direction === "IN" ? "moved in" : "moved out";
  const dirEmoji = direction === "IN" ? "📥" : "📤";

  const openers = [
    `${dirEmoji} whale just ${dirWord} — worth watching`,
    `big money ${dirWord} on ${symbol}. keeping an eye on this.`,
    `on-chain picked up a large move. ${dirWord}.`,
    `whale alert — ${solAmount.toLocaleString()} SOL ${dirWord}`,
  ];

  return [
    pick(openers),
    "",
    `🐋 ${label}`,
    `Amount: ${solAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} SOL (~${formatPrice(usdValue, 0)})`,
    `Direction: ${direction}`,
    "",
    "not necessarily bullish/bearish — context matters",
    "DYOR | #Solana #Crypto #OnChain",
  ].join("\n");
}

export function buildTaThread(result: TAResult): string[] {
  const token = `$${result.symbol}`;
  const price = formatPrice(result.price);
  const sigEmoji = { BUY: "🟢", SELL: "🔴", HOLD: "🟡" }[result.signal] ?? "⚪";

  const tweet1 = [
    `been running the charts on ${token} — here's what I'm seeing 🧵`,
    "",
    `price: ${price}`,
    `signal: ${sigEmoji} ${result.signal} (${result.confidence}/100)`,
    "",
    "thread below 👇",
  ].join("\n");

  const tweet2Lines = [`📐 RSI & Momentum — ${token}`];
  if (result.rsi !== null) {
    const zone =
      result.rsi < 30 ? "oversold 🔥" : result.rsi > 70 ? "overbought ⚠️" : "neutral";
    tweet2Lines.push(`RSI(14): ${result.rsi.toFixed(1)} — ${zone}`);
  }
  if (result.macd !== null) {
    const direction = result.macd > 0 ? "above" : "below";
    tweet2Lines.push(
      `MACD ${direction} signal line — momentum is ${result.macd > 0 ? "bullish" : "bearish"}`,
    );
  }

  const tweet3Lines = [`📊 Structure — ${token}`];
  if (result.bbUpper !== null && result.bbLower !== null) {
    tweet3Lines.push(
      `Bollinger Bands: ${formatPrice(result.bbLower)} — ${formatPrice(result.bbUpper)}`,
    );
    if (result.bbPct !== null) {
      const pctDesc =
        result.bbPct < 0.3 ? "near lower band" : result.bbPct > 0.7 ? "near upper band" : "mid-range";
      tweet3Lines.push(`price is ${pctDesc} (%B: ${result.bbPct.toFixed(2)})`);
    }
  }
  if (result.ema9 !== null && result.ema21 !== null) {
    const trend = result.price > result.ema21 ? "above" : "below";
    tweet3Lines.push(
      `price is ${trend} EMA(21) — ${result.price > result.ema21 ? "bullish" : "bearish"} structure`,
    );
  }

  const tweet4Lines = [`🎯 My take on ${token}`];
  for (const r of result.reasons.slice(0, 3)) tweet4Lines.push(`• ${r}`);
  tweet4Lines.push("", "NFA. manage your risk. DYOR always.", "#Crypto #Trading #Solana");

  return [tweet1, tweet2Lines.join("\n"), tweet3Lines.join("\n"), tweet4Lines.join("\n")];
}

export function previewAll(results: TAResult[]): void {
  console.log("\n━━━ SINGLE SIGNAL POSTS ━━━\n");
  for (const r of results) {
    console.log(`--- $${r.symbol} ---`);
    console.log(buildSignalPost(r));
    console.log();
  }

  console.log("\n━━━ MARKET SCAN POST ━━━\n");
  console.log(buildMarketUpdatePost(results));

  if (results.length) {
    console.log("\n━━━ TA THREAD (first token) ━━━\n");
    buildTaThread(results[0]).forEach((tweet, i) => {
      console.log(`--- Tweet ${i + 1}/4 ---`);
      console.log(tweet);
      console.log();
    });
  }
}
