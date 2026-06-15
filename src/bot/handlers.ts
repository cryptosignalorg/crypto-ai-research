/**
 * Orin.LAB · Telegram Bot Handlers
 */

import { Context, Markup } from "telegraf";
import { chat, chatWithImage } from "../ai-client";
import { anthropicLimiter } from "../rate-limiter";
import { getLogger } from "../logger";
import { SignalHistory } from "../agents/signal-history";
import { analyze, formatReport } from "../agents/technical-analysis";
import { buildSignalPost, buildTaThread } from "../agents/post-writer";

const logger = getLogger("bot.handlers");

const chatHistory = new Map<number, Array<{ role: "user" | "assistant"; content: string }>>();
const MAX_HISTORY = 20;
const signalHistory = new SignalHistory();

const SYSTEM_PROMPT = `You are Orin, an expert AI crypto market analyst from Orin.LAB.
You specialize in Solana ecosystem, DeFi, and crypto market analysis.

Your style:
- Direct and concise
- Data-driven, not hype-driven
- Always mention risk when giving signals
- Use technical terms naturally but explain when needed
- Never give guaranteed predictions — frame as probabilities

When asked for signals, always output:
SIGNAL: BUY / SELL / HOLD
Confidence: X/100
Reasoning: (2-3 sentences)
Risk: (1 sentence)`;

const CHART_PROMPT = `You are Orin, an expert crypto chart analyst from Orin.LAB.
Analyze this chart image and provide:

1. **Trend** — current trend direction and strength
2. **Key Levels** — support and resistance levels visible
3. **Pattern** — any chart patterns (head & shoulders, triangle, etc.)
4. **Signal** — BUY / SELL / HOLD with confidence score
5. **Target** — price target if signal is BUY/SELL
6. **Stop Loss** — recommended stop loss level
7. **Risk** — LOW / MEDIUM / HIGH

Be specific with price levels if visible. Keep it concise and actionable.`;

function getTokenArg(ctx: Context): string {
  const text = "text" in (ctx.message ?? {}) ? (ctx.message as { text: string }).text : "";
  const parts = text.split(/\s+/).slice(1);
  const token = parts.join(" ") || "SOL";
  return token.toUpperCase().replace("$", "");
}

function replyTarget(ctx: Context) {
  if (ctx.callbackQuery && "message" in ctx.callbackQuery && ctx.callbackQuery.message) {
    return ctx.callbackQuery.message;
  }
  return ctx.message;
}

export async function handleStart(ctx: Context): Promise<void> {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("📊 Signal", "signal"),
      Markup.button.callback("🔍 Analyze", "analyze"),
    ],
    [
      Markup.button.callback("📈 History", "history"),
      Markup.button.callback("🐋 Whales", "whales"),
    ],
    [Markup.button.callback("❓ Help", "help")],
  ]);

  await ctx.reply(
    "👋 *Welcome to Orin.LAB*\n\n" +
      "I'm Orin — your AI crypto research assistant.\n\n" +
      "📊 Use:\n" +
      "/signal `$SOL` — trading signal\n" +
      "/analyze `$TOKEN` — deep analysis\n" +
      "/history — recent signal history\n" +
      "/help — all commands\n\n" +
      "📸 *Send a chart photo* for instant AI analysis!",
    { parse_mode: "Markdown", ...keyboard },
  );
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    "*Orin.LAB Commands*\n\n" +
      "/signal `$TOKEN` — BUY/SELL/HOLD signal with confidence\n" +
      "/analyze `$TOKEN` — deep AI market analysis\n" +
      "/ta `$TOKEN` — full technical analysis\n" +
      "/post `$TOKEN` — generate Twitter/X post\n" +
      "/history — last 10 signals generated\n" +
      "/start — show welcome menu\n" +
      "/help — show this message\n\n" +
      "📸 *Send any chart image* → instant AI chart analysis\n" +
      "_Or just chat — I understand crypto questions naturally._",
    { parse_mode: "Markdown" },
  );
}

export async function handleSignal(ctx: Context): Promise<void> {
  return handleSignalForToken(ctx, getTokenArg(ctx));
}

async function handleSignalForToken(ctx: Context, token: string): Promise<void> {
  const msg = replyTarget(ctx);
  if (!msg || !("reply" in msg)) return;

  await ctx.telegram.sendMessage(msg.chat.id, `🔍 Analyzing \`${token}\`...`, { parse_mode: "Markdown" });

  try {
    await anthropicLimiter.waitAndAcquire();
    const signalText = await chat(
      [{ role: "user", content: `Generate a trading signal for $${token} based on current market conditions.` }],
      SYSTEM_PROMPT,
      300,
    );
    signalHistory.add(token, signalText);
    await ctx.telegram.sendMessage(msg.chat.id, `📊 *Signal: $${token}*\n\n${signalText}`, {
      parse_mode: "Markdown",
    });
    logger.info(`Signal generated: ${token}`);
  } catch (err) {
    logger.error(`Signal error: ${err}`);
    await ctx.telegram.sendMessage(msg.chat.id, `⚠️ Error: ${err}`);
  }
}

export async function handleAnalyze(ctx: Context): Promise<void> {
  return handleAnalyzeForToken(ctx, getTokenArg(ctx));
}

async function handleAnalyzeForToken(ctx: Context, token: string): Promise<void> {
  const msg = replyTarget(ctx);
  if (!msg || !("reply" in msg)) return;

  await ctx.telegram.sendMessage(msg.chat.id, `🧪 Running deep analysis on \`${token}\`...`, {
    parse_mode: "Markdown",
  });

  try {
    await anthropicLimiter.waitAndAcquire();
    const analysis = await chat(
      [
        {
          role: "user",
          content: `Provide a comprehensive market analysis for $${token}. Cover: price action, key levels, ecosystem news, risks, and outlook.`,
        },
      ],
      SYSTEM_PROMPT,
      600,
    );
    await ctx.telegram.sendMessage(msg.chat.id, `🔬 *Analysis: $${token}*\n\n${analysis}`, {
      parse_mode: "Markdown",
    });
    logger.info(`Analysis generated: ${token}`);
  } catch (err) {
    logger.error(`Analyze error: ${err}`);
    await ctx.telegram.sendMessage(msg.chat.id, `⚠️ Error: ${err}`);
  }
}

export async function handlePhoto(ctx: Context): Promise<void> {
  if (!ctx.message || !("photo" in ctx.message)) return;
  const caption = "caption" in ctx.message ? (ctx.message.caption ?? "").trim() : "";

  await ctx.reply("📸 *Chart received — analyzing...*", { parse_mode: "Markdown" });

  try {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const resp = await fetch(fileLink.href);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const imageB64 = buffer.toString("base64");

    await anthropicLimiter.waitAndAcquire();
    const prompt = CHART_PROMPT + (caption ? `\n\nUser note: ${caption}` : "");
    const analysis = await chatWithImage(imageB64, prompt);
    await ctx.reply(`📈 *Chart Analysis*\n\n${analysis}`, { parse_mode: "Markdown" });
    logger.info("Chart analysis completed");
  } catch (err) {
    logger.error(`Photo analysis error: ${err}`);
    await ctx.reply(`⚠️ Could not analyze chart: ${err}`);
  }
}

export async function handlePost(ctx: Context): Promise<void> {
  const token = getTokenArg(ctx);
  const msg = replyTarget(ctx);
  if (!msg || !("reply" in msg)) return;

  await ctx.telegram.sendMessage(msg.chat.id, `✍️ Writing post for \`${token}\`...`, { parse_mode: "Markdown" });

  try {
    const result = await analyze(token);
    const post = buildSignalPost(result);
    const thread = buildTaThread(result);

    await ctx.telegram.sendMessage(msg.chat.id, `*Ready-to-post tweet:*\n\n\`\`\`\n${post}\n\`\`\``, {
      parse_mode: "Markdown",
    });
    await ctx.telegram.sendMessage(
      msg.chat.id,
      `*Thread version (1/4):*\n\n\`\`\`\n${thread[0]}\n\`\`\``,
      { parse_mode: "Markdown" },
    );
    logger.info(`Post generated: ${token}`);
  } catch (err) {
    logger.error(`Post error: ${err}`);
    await ctx.telegram.sendMessage(msg.chat.id, `⚠️ Error: ${err}`);
  }
}

export async function handleTa(ctx: Context): Promise<void> {
  const token = getTokenArg(ctx);
  const msg = replyTarget(ctx);
  if (!msg || !("reply" in msg)) return;

  await ctx.telegram.sendMessage(msg.chat.id, `📐 Running TA on \`${token}\`...`, { parse_mode: "Markdown" });

  try {
    const result = await analyze(token);
    signalHistory.add(token, `SIGNAL: ${result.signal}\nConfidence: ${result.confidence}/100`);
    await ctx.telegram.sendMessage(msg.chat.id, formatReport(result), { parse_mode: "Markdown" });
    logger.info(`TA completed: ${token} → ${result.signal} (${result.confidence})`);
  } catch (err) {
    logger.error(`TA error: ${err}`);
    await ctx.telegram.sendMessage(msg.chat.id, `⚠️ Error: ${err}`);
  }
}

export async function handleHistory(ctx: Context): Promise<void> {
  const records = signalHistory.getRecent(10);
  const msg = replyTarget(ctx);
  if (!msg || !("reply" in msg)) return;

  if (!records.length) {
    await ctx.telegram.sendMessage(msg.chat.id, "📭 No signal history yet. Try `/signal $SOL`!", {
      parse_mode: "Markdown",
    });
    return;
  }

  const lines = ["📋 *Recent Signals*\n"];
  for (const r of records) {
    lines.push(`\`${r.time}\` *${r.token}* — ${r.signal} (${r.confidence})`);
  }
  await ctx.telegram.sendMessage(msg.chat.id, lines.join("\n"), { parse_mode: "Markdown" });
}

export async function handleMessage(ctx: Context): Promise<void> {
  if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (!chatHistory.has(userId)) chatHistory.set(userId, []);
  const history = chatHistory.get(userId)!;
  history.push({ role: "user", content: text });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

  try {
    await anthropicLimiter.waitAndAcquire();
    const reply = await chat(history, SYSTEM_PROMPT, 400);
    history.push({ role: "assistant", content: reply });
    await ctx.reply(reply);
  } catch (err) {
    logger.error(`Chat error: ${err}`);
    await ctx.reply(`⚠️ ${err}`);
  }
}

export async function handleCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;
  await ctx.answerCbQuery();

  const data = ctx.callbackQuery.data;
  if (data === "signal") await handleSignalForToken(ctx, "SOL");
  else if (data === "analyze") await handleAnalyzeForToken(ctx, "SOL");
  else if (data === "history") await handleHistory(ctx);
  else if (data === "help") await handleHelp(ctx);
  else if (data === "whales") {
    const msg = replyTarget(ctx);
    if (msg && "chat" in msg) {
      await ctx.telegram.sendMessage(
        msg.chat.id,
        "🐋 *Whale Tracker*\n\nMonitoring large Solana wallets automatically.\nAlerts fire when moves exceed $50,000 USD.",
        { parse_mode: "Markdown" },
      );
    }
  }
}
