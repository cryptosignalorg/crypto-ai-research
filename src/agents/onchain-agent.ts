/**
 * Orin.LAB · On-chain Agent
 * Solana wallet and transaction monitoring via JSON-RPC.
 */

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

export const KNOWN_WALLETS: Record<string, string> = {
  "Jump Trading": "3oSE59Y4jBGCFpFuzpuK5UWrfNn3TaAPWmyMzrxWnYpC",
  "Alameda (old)": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
};

export interface TxSignature {
  signature: string;
  slot: number;
  err: unknown;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | { error: string }> {
  try {
    const resp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return { error: resp.statusText };
    const data = (await resp.json()) as { result?: T };
    return data.result ?? { error: "no result" };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getBalance(address: string): Promise<number> {
  const result = await rpcCall<{ value: number }>("getBalance", [address]);
  if (result && typeof result === "object" && "value" in result) {
    return result.value / 1e9;
  }
  return 0;
}

export async function getRecentTransactions(address: string, limit = 5): Promise<TxSignature[]> {
  const result = await rpcCall<TxSignature[]>("getSignaturesForAddress", [address, { limit }]);
  return Array.isArray(result) ? result : [];
}

export async function getTokenAccounts(address: string): Promise<unknown[]> {
  const result = await rpcCall<{ value: unknown[] }>("getTokenAccountsByOwner", [
    address,
    { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    { encoding: "jsonParsed" },
  ]);
  if (result && typeof result === "object" && "value" in result) return result.value;
  return [];
}
