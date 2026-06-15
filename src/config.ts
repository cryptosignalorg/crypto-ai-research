/**
 * Orin.LAB · Config
 * Typed configuration loader from environment variables.
 */

export interface Config {
  anthropicApiKey: string;
  claudeModel: string;
  telegramBotToken: string;
  telegramAllowedUsers: number[];
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  solanaRpcUrl: string;
  solanaWalletAddress: string | null;
  signalIntervalSeconds: number;
  signalConfidenceThreshold: number;
  rateLimitCalls: number;
  rateLimitPeriod: number;
  redisUrl: string | null;
  redisHost: string | null;
  redisPort: number;
  redisDb: number;
  redisKeyPrefix: string;
}

function parseIntOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseAllowedUsers(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((uid) => uid.trim())
    .filter((uid) => /^\d+$/.test(uid))
    .map((uid) => parseInt(uid, 10));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    claudeModel: env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN ?? "",
    telegramAllowedUsers: parseAllowedUsers(env.TELEGRAM_ALLOWED_USERS),
    twitterApiKey: env.TWITTER_API_KEY ?? "",
    twitterApiSecret: env.TWITTER_API_SECRET ?? "",
    twitterAccessToken: env.TWITTER_ACCESS_TOKEN ?? "",
    twitterAccessSecret: env.TWITTER_ACCESS_SECRET ?? "",
    solanaRpcUrl: env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    solanaWalletAddress: env.SOLANA_WALLET_ADDRESS?.trim() || null,
    signalIntervalSeconds: parseIntOrDefault(env.SIGNAL_INTERVAL, 300),
    signalConfidenceThreshold: parseIntOrDefault(env.SIGNAL_CONFIDENCE_THRESHOLD, 70),
    rateLimitCalls: parseIntOrDefault(env.RATE_LIMIT_CALLS, 10),
    rateLimitPeriod: parseIntOrDefault(env.RATE_LIMIT_PERIOD, 60),
    redisUrl: env.REDIS_URL?.trim() || null,
    redisHost: env.REDIS_HOST?.trim() || null,
    redisPort: parseIntOrDefault(env.REDIS_PORT, 6379),
    redisDb: parseIntOrDefault(env.REDIS_DB, 0),
    redisKeyPrefix: env.REDIS_KEY_PREFIX?.trim() || "orinlab",
  };
}

export function validateConfig(cfg: Config): string[] {
  const errors: string[] = [];
  if (!cfg.anthropicApiKey) errors.push("ANTHROPIC_API_KEY");
  if (!cfg.telegramBotToken) errors.push("TELEGRAM_BOT_TOKEN");
  return errors;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) cachedConfig = loadConfig();
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
