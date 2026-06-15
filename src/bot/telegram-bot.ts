/**
 * Orin.LAB · Telegram Bot
 * AI-powered Telegram bot for crypto market analysis and signal delivery.
 */

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { getLogger } from "../logger";
import {
  handleStart,
  handleHelp,
  handleSignal,
  handleAnalyze,
  handleTa,
  handlePost,
  handlePhoto,
  handleHistory,
  handleMessage,
  handleCallback,
} from "./handlers";

const logger = getLogger("telegram_bot");

export function runBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set in environment");

  const bot = new Telegraf(token);

  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("signal", handleSignal);
  bot.command("analyze", handleAnalyze);
  bot.command("history", handleHistory);
  bot.command("ta", handleTa);
  bot.command("post", handlePost);
  bot.on("callback_query", handleCallback);
  bot.on(message("photo"), handlePhoto);
  bot.on(message("text"), (ctx, next) => {
    if (ctx.message.text.startsWith("/")) return next();
    return handleMessage(ctx);
  });

  logger.info("Orin.LAB Telegram Bot started");
  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
