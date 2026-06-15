#!/usr/bin/env node
/**
 * Orin.LAB CLI entry point
 */

import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { config as loadDotenv } from "dotenv";
import { Command } from "commander";
import { runSetup } from "./setup";
import { runBot } from "../bot/telegram-bot";
import { fetchPrice, generateSignal, TOKENS } from "../agents/signal-engine";
import { runMarketAnalysis } from "../agents/market-analyst";
import { getBalance, getRecentTransactions, KNOWN_WALLETS } from "../agents/onchain-agent";
import { analyze } from "../agents/technical-analysis";
import { previewAll } from "../agents/post-writer";
import * as readline from "readline";

const homeEnv = join(homedir(), ".orinlab", ".env");
if (existsSync(homeEnv)) loadDotenv({ path: homeEnv });
else loadDotenv();

const BANNER =
  "Orin.LAB — AI Research Lab for Crypto Markets — $ORNL — Built on Solana";

function createRl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

async function runSignalEngine(): Promise<void> {
  console.log("\nOrin.LAB · Signal Engine");
  console.log("On-chain + AI powered trading signals\n");

  const rl = createRl();

  while (true) {
    console.log("Options:");
    console.log("  1  Generate signal for a token");
    console.log("  2  Scan all tokens");
    console.log("  q  Quit\n");

    const choice = await ask(rl, "Choose: ");
    if (choice.toLowerCase() === "q") break;

    if (choice === "1") {
      let symbol = (await ask(rl, "Token (e.g. SOL): ")).toUpperCase();
      let mint = TOKENS[symbol];
      if (!mint) mint = await ask(rl, `CoinGecko ID for ${symbol}: `);

      console.log(`Fetching ${symbol} price...`);
      const price = await fetchPrice(mint);
      console.log("Generating signal with AI...");
      const signal = await generateSignal(symbol, price);
      console.log(`\n--- Orin.LAB Signal: $${symbol} ---\n${signal}\n`);
    } else if (choice === "2") {
      console.log("\nToken Scan:");
      for (const [symbol, mint] of Object.entries(TOKENS)) {
        process.stdout.write(`Scanning ${symbol}... `);
        const price = await fetchPrice(mint);
        if (price > 0) {
          const sig = await generateSignal(symbol, price);
          const sigLine = sig.split("\n")[0] ?? "N/A";
          console.log(`${symbol} $${price.toFixed(4)} — ${sigLine}`);
        } else {
          console.log(`${symbol} — no data`);
        }
      }
      console.log();
    }
  }

  rl.close();
}

async function runOnchainAgent(): Promise<void> {
  console.log("\nOrin.LAB · On-chain Agent");
  console.log("Solana wallet and transaction monitor\n");

  const rl = createRl();

  while (true) {
    console.log("Options:");
    console.log("  1  Check wallet balance");
    console.log("  2  View recent transactions");
    console.log("  3  Monitor known wallets");
    console.log("  q  Quit\n");

    const choice = await ask(rl, "Choose: ");
    if (choice.toLowerCase() === "q") break;

    if (choice === "1") {
      const address = await ask(rl, "Wallet address: ");
      const balance = await getBalance(address);
      console.log(`\nBalance: ${balance.toFixed(4)} SOL\n`);
    } else if (choice === "2") {
      const address = await ask(rl, "Wallet address: ");
      const txs = await getRecentTransactions(address);
      if (!txs.length) {
        console.log("\nNo recent transactions found.\n");
      } else {
        console.log("\nRecent Transactions:");
        for (const tx of txs) {
          const sig = tx.signature.slice(0, 20) + "...";
          const status = tx.err ? "Failed" : "Success";
          console.log(`  ${sig}  slot=${tx.slot}  ${status}`);
        }
        console.log();
      }
    } else if (choice === "3") {
      console.log("\nKnown Wallets:");
      for (const [label, address] of Object.entries(KNOWN_WALLETS)) {
        const balance = await getBalance(address);
        console.log(`  ${label}: ${address.slice(0, 16)}... — ${balance.toFixed(2)} SOL`);
      }
      console.log();
    }
  }

  rl.close();
}

async function runMarketAnalystCli(): Promise<void> {
  console.log("\nOrin.LAB · Market Analyst");
  console.log("Deep AI market analysis\n");

  const rl = createRl();

  while (true) {
    const token = (await ask(rl, "Enter token (e.g. SOL) or q to quit: ")).toUpperCase();
    if (token === "Q") break;

    console.log("Fetching market data...");
    console.log("Running deep analysis with Claude...");
    const result = await runMarketAnalysis(token);
    console.log(`\n--- Orin.LAB Analysis: $${token} ---\n${result}\n`);
  }

  rl.close();
}

const program = new Command();

program.name("orinlab").description("Orin.LAB — AI Research Lab for Crypto Markets").hook("preAction", () => {
  console.log(BANNER);
});

program.command("setup").description("First-time setup — configure API keys interactively").action(async () => {
  await runSetup();
});

program.command("bot").description("Launch Telegram AI Bot").action(() => {
  console.log("Starting Telegram Bot...");
  runBot();
});

program.command("signal").description("Launch Signal Engine — generate market signals").action(async () => {
  await runSignalEngine();
});

program.command("analyst").description("Launch Market Analyst — deep AI market analysis").action(async () => {
  await runMarketAnalystCli();
});

program.command("onchain").description("Launch On-chain Agent — Solana wallet monitoring").action(async () => {
  await runOnchainAgent();
});

program
  .command("posts")
  .description("Preview natural posts for given tokens (default: SOL BTC ETH)")
  .argument("[tokens...]", "Token symbols")
  .action(async (tokens: string[]) => {
    const symbols = tokens.length ? tokens : ["SOL", "BTC", "ETH"];
    console.log(`Generating posts for ${symbols.map((s) => `$${s}`).join(", ")}...`);
    const results = [];
    for (const sym of symbols) {
      process.stdout.write(`Analyzing $${sym}... `);
      results.push(await analyze(sym));
      console.log("done");
    }
    previewAll(results);
  });

program.parse();
