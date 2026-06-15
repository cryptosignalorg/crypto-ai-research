/**
 * Orin.LAB · Signal History
 * Append-only signal log stored as JSON on disk.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { extractConfidence, extractSignalType } from "../helpers";
import { getLogger } from "../logger";

const logger = getLogger("signal_history");

const DEFAULT_PATH = process.env.SIGNAL_HISTORY_PATH ?? join(process.cwd(), "data", "signal_history.json");
const MAX_RECORDS = 500;

export interface SignalRecord {
  id: string;
  time: string;
  token: string;
  signal: string;
  confidence: string;
  raw: string;
}

export class SignalHistory {
  private readonly path: string;

  constructor(path = DEFAULT_PATH) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path)) writeFileSync(path, "[]", "utf-8");
  }

  private load(): SignalRecord[] {
    try {
      return JSON.parse(readFileSync(this.path, "utf-8")) as SignalRecord[];
    } catch {
      return [];
    }
  }

  private save(records: SignalRecord[]): void {
    writeFileSync(this.path, JSON.stringify(records, null, 2), "utf-8");
  }

  add(token: string, signalText: string): SignalRecord {
    const sigType = extractSignalType(signalText) ?? "UNKNOWN";
    const confidence = extractConfidence(signalText);
    const now = new Date();

    const record: SignalRecord = {
      id: now.toISOString().replace(/\D/g, ""),
      time: now.toISOString().slice(0, 16).replace("T", " ") + " UTC",
      token: token.toUpperCase(),
      signal: sigType,
      confidence: confidence !== null ? `${confidence}/100` : "–",
      raw: signalText,
    };

    const records = this.load();
    records.push(record);
    if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
    this.save(records);
    logger.debug(`Signal saved: ${token} → ${sigType}`);
    return record;
  }

  getRecent(n = 10): SignalRecord[] {
    const records = this.load();
    return records.slice(-n).reverse();
  }

  getByToken(token: string, n = 10): SignalRecord[] {
    const records = this.load().filter((r) => r.token === token.toUpperCase());
    return records.slice(-n).reverse();
  }

  stats(): Record<string, unknown> {
    const records = this.load();
    if (!records.length) return { total: 0 };

    const counts: Record<string, number> = {};
    const tokens: Record<string, number> = {};
    for (const r of records) {
      counts[r.signal] = (counts[r.signal] ?? 0) + 1;
      tokens[r.token] = (tokens[r.token] ?? 0) + 1;
    }

    const topTokens = Object.entries(tokens)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: records.length,
      buy: counts.BUY ?? 0,
      sell: counts.SELL ?? 0,
      hold: counts.HOLD ?? 0,
      top_tokens: topTokens,
      first: records[0]?.time ?? null,
      last: records[records.length - 1]?.time ?? null,
    };
  }

  clear(): void {
    this.save([]);
    logger.info("Signal history cleared");
  }
}
