import { describe, expect, it } from "vitest";
import { loadConfig, validateConfig } from "../src/config";

describe("config", () => {
  it("loads defaults", () => {
    const cfg = loadConfig({});
    expect(cfg.claudeModel).toBe("claude-haiku-4-5-20251001");
    expect(cfg.signalIntervalSeconds).toBe(300);
    expect(cfg.redisKeyPrefix).toBe("orinlab");
  });

  it("parses env vars", () => {
    const cfg = loadConfig({
      ANTHROPIC_API_KEY: "sk-test",
      TELEGRAM_BOT_TOKEN: "bot-test",
      REDIS_URL: "redis://localhost:6379",
      REDIS_KEY_PREFIX: "test",
      TELEGRAM_ALLOWED_USERS: "123,456",
    });
    expect(cfg.anthropicApiKey).toBe("sk-test");
    expect(cfg.telegramBotToken).toBe("bot-test");
    expect(cfg.redisUrl).toBe("redis://localhost:6379");
    expect(cfg.redisKeyPrefix).toBe("test");
    expect(cfg.telegramAllowedUsers).toEqual([123, 456]);
  });

  it("validates required keys", () => {
    expect(validateConfig(loadConfig({}))).toEqual(["ANTHROPIC_API_KEY", "TELEGRAM_BOT_TOKEN"]);
    expect(validateConfig(loadConfig({ ANTHROPIC_API_KEY: "x", TELEGRAM_BOT_TOKEN: "y" }))).toEqual([]);
  });
});
