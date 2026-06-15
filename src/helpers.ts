/**
 * Orin.LAB · Helpers
 * Formatting, parsing, and misc utility functions.
 */

export function formatPrice(price: number, decimals = 4): string {
  if (price >= 1_000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(decimals)}`;
}

export function formatPct(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatSignalBadge(signalLine: string): string {
  const upper = signalLine.toUpperCase();
  if (upper.includes("BUY")) return "🟢 BUY";
  if (upper.includes("SELL")) return "🔴 SELL";
  return "🟡 HOLD";
}

export function truncate(text: string, maxLen = 280, suffix = "…"): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - suffix.length) + suffix;
}

export function extractConfidence(signalText: string): number | null {
  const match = signalText.match(/Confidence:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function extractSignalType(signalText: string): "BUY" | "SELL" | "HOLD" | null {
  const match = signalText.match(/SIGNAL:\s*(BUY|SELL|HOLD)/i);
  return match ? (match[1].toUpperCase() as "BUY" | "SELL" | "HOLD") : null;
}

export function solExplorerUrl(address: string): string {
  return `https://solscan.io/account/${address}`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
