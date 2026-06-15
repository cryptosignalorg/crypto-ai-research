/**
 * Orin.LAB · Whale Tracker
 * Monitor large Solana wallet movements and alert on significant transactions.
 */

import { formatPrice, shortenAddress } from "../helpers";
import { getLogger } from "../logger";

const logger = getLogger("whale_tracker");

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";
const SOL_MINT = "So11111111111111111111111111111111111111112";

export const WHALE_THRESHOLD_USD = 50_000;

export const KNOWN_WHALES: Record<string, string> = {
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Jump Crypto",
  FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5: "Alameda (dormant)",
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1": "Binance Hot Wallet",
};

export interface WhaleAlert {
  wallet: string;
  label: string;
  signature: string;
  solAmount: number;
  usdValue: number;
  direction: "IN" | "OUT";
  message: string;
}

export type WhaleHandler = (alert: WhaleAlert) => Promise<void>;

async function solPrice(): Promise<number> {
  try {
    const resp = await fetch(`${JUPITER_PRICE_API}?ids=${SOL_MINT}`, { signal: AbortSignal.timeout(8_000) });
    if (!resp.ok) return 0;
    const data = (await resp.json()) as { data?: Record<string, { price?: number }> };
    return data.data?.[SOL_MINT]?.price ?? 0;
  } catch {
    return 0;
  }
}

async function getSignatures(wallet: string, limit = 10): Promise<Array<{ signature: string; err: unknown }>> {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [wallet, { limit }],
  };
  try {
    const resp = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { result?: Array<{ signature: string; err: unknown }> };
    return data.result ?? [];
  } catch (err) {
    logger.warn(`getSignaturesForAddress failed for ${wallet}: ${err}`);
    return [];
  }
}

async function getTransaction(sig: string): Promise<Record<string, unknown> | null> {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [sig, { encoding: "json", maxSupportedTransactionVersion: 0 }],
  };
  try {
    const resp = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { result?: Record<string, unknown> | null };
    return data.result ?? null;
  } catch {
    return null;
  }
}

function parseSolChange(tx: Record<string, unknown>, wallet: string): number | null {
  try {
    const transaction = tx.transaction as { message: { accountKeys: unknown[] } };
    const meta = tx.meta as { preBalances: number[]; postBalances: number[] };
    const accounts = transaction.message.accountKeys;
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const addr = typeof acc === "string" ? acc : (acc as { pubkey: string }).pubkey;
      if (addr === wallet) return (meta.postBalances[i] - meta.preBalances[i]) / 1e9;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

export class WhaleTracker {
  private wallets: Record<string, string>;
  private readonly thresholdUsd: number;
  private readonly pollInterval: number;
  private readonly seenSigs = new Set<string>();
  private readonly handlers: WhaleHandler[] = [];
  private running = false;

  constructor(
    wallets: Record<string, string> = KNOWN_WHALES,
    thresholdUsd = WHALE_THRESHOLD_USD,
    pollInterval = 60_000,
  ) {
    this.wallets = wallets;
    this.thresholdUsd = thresholdUsd;
    this.pollInterval = pollInterval;
  }

  register(handler: WhaleHandler): void {
    this.handlers.push(handler);
  }

  addWallet(address: string, label = "Unknown"): void {
    this.wallets[address] = label;
    logger.info(`Watching wallet: ${label} (${shortenAddress(address)})`);
  }

  private async fire(alert: WhaleAlert): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(alert);
      } catch (err) {
        logger.error(`Whale handler error: ${err}`);
      }
    }
  }

  async checkWallet(wallet: string, label: string, price: number): Promise<WhaleAlert[]> {
    const alerts: WhaleAlert[] = [];
    const sigs = await getSignatures(wallet, 5);

    for (const entry of sigs) {
      const sig = entry.signature;
      if (this.seenSigs.has(sig) || entry.err) continue;
      this.seenSigs.add(sig);

      const tx = await getTransaction(sig);
      if (!tx) continue;

      const change = parseSolChange(tx, wallet);
      if (change === null) continue;

      const usdValue = Math.abs(change) * price;
      if (usdValue < this.thresholdUsd) continue;

      const direction: "IN" | "OUT" = change > 0 ? "IN" : "OUT";
      const short = shortenAddress(wallet);
      const alert: WhaleAlert = {
        wallet,
        label,
        signature: sig,
        solAmount: Math.abs(change),
        usdValue,
        direction,
        message:
          `🐋 *Whale Alert — ${label}*\n` +
          `\`${short}\` moved *${Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })} SOL* ` +
          `(~${formatPrice(usdValue, 0)}) ${direction}\n` +
          `[View tx](https://solscan.io/tx/${sig})`,
      };

      await this.fire(alert);
      alerts.push(alert);
      logger.info(`Whale alert: ${label} ${direction} ${Math.abs(change).toFixed(1)} SOL ($${usdValue.toLocaleString()})`);
    }

    return alerts;
  }

  async run(): Promise<void> {
    this.running = true;
    logger.info(`WhaleTracker started — watching ${Object.keys(this.wallets).length} wallets`);

    while (this.running) {
      const price = await solPrice();
      await Promise.all(
        Object.entries(this.wallets).map(([addr, label]) => this.checkWallet(addr, label, price)),
      );
      await new Promise((r) => setTimeout(r, this.pollInterval));
    }
  }

  stop(): void {
    this.running = false;
  }
}
