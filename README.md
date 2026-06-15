<div align="center">

<img src="https://img.shields.io/badge/Orin.LAB-AI%20Research%20Lab-cyan?style=for-the-badge&labelColor=0d1117" alt="Orin.LAB" />

# Orin.LAB

**AI Research Lab for Crypto Markets**

*Reads the market. Signals the moves. Posts the alpha.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Rust](https://img.shields.io/badge/Rust-1.76+-CE422B?style=flat-square&logo=rust&logoColor=white)](https://rust-lang.org)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?style=flat-square&logo=solana&logoColor=white)](https://solana.com)
[![Token](https://img.shields.io/badge/%24ORNL-6Nfn8vpwEmGSyjYgHMctt9hrsB6TBa5TT1WjonRpump-orange?style=flat-square)](https://pump.fun/coin/6Nfn8vpwEmGSyjYgHMctt9hrsB6TBa5TT1WjonRpump)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## What is Orin.LAB?

Orin.LAB is an open-source AI research lab for crypto markets — built on Solana and powered by Claude AI.

It connects **on-chain data**, **AI reasoning**, and **automated distribution** into a single, modular TypeScript toolkit:

- 🤖 **Telegram bot** that answers market questions, analyzes chart photos, and delivers signals in real time
- 📊 **Signal engine** with pure TypeScript TA (RSI, MACD, Bollinger Bands, EMA, ATR) — no external TA libraries
- 🐋 **Whale tracker** that monitors large Solana wallets and fires instant alerts on big moves
- 🐦 **Auto poster** that generates natural, human-style posts ready for Twitter/X
- ⚡ **High-performance core** written in Rust for heavy computation

> *"Orin.LAB doesn't predict. It researches, signals, and acts."*

---

## Install

```bash
git clone https://github.com/cryptosignalorg/crypto-ai-research.git
cd crypto-ai-research
npm install
npm run build
```

---

## Quickstart

```bash
# 1. Setup — interactive wizard, takes ~1 minute
npx orinlab setup

# 2. Run
npx orinlab bot        # Telegram AI bot
npx orinlab signal     # Signal engine (terminal)
npx orinlab posts SOL  # Generate posts for $SOL
npx orinlab onchain    # Solana wallet monitor
```

### What `orinlab setup` looks like

```
Step 1 — AI Provider
  1 Anthropic (Claude)
  2 DeepInfra (free tier)
Choose provider: 2
DeepInfra API key: ••••••••

Step 2 — Telegram Bot
Telegram bot token: ••••••••

Step 3 — Solana (optional)
Configure Solana wallet tracking? [y/N]

Step 4 — Twitter/X Auto Poster (optional)
Configure Twitter/X posting? [y/N]

✓ Setup complete! Config saved to ~/.orinlab/.env
  orinlab bot      — start Telegram bot
  orinlab signal   — signal engine
```

Config is saved to `~/.orinlab/.env` — edit anytime to update keys.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Orin.LAB                         │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Telegram Bot │    │ Signal Engine│                   │
│  │ (TypeScript) │    │ (TypeScript) │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                           │
│         └─────────┬─────────┘                           │
│                   ▼                                     │
│          ┌────────────────┐                             │
│          │   Claude AI    │  ← Anthropic / DeepInfra    │
│          │  (Haiku/Sonnet)│                             │
│          └────────┬───────┘                             │
│                   │                                     │
│         ┌─────────┴──────────┐                          │
│         ▼                    ▼                          │
│  ┌─────────────┐    ┌────────────────┐                  │
│  │ Auto Poster │    │  On-chain Agent│                   │
│  │ (TypeScript)│    │  (TypeScript)  │                   │
│  └──────┬──────┘    └───────┬────────┘                  │
│         │                   │                           │
│         ▼                   ▼                           │
│    Twitter/X           Solana RPC                       │
│                      (CoinGecko API)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Modules

| Module | Language | Description |
|--------|----------|-------------|
| [**Telegram Bot**](src/bot/) | TypeScript | AI-powered bot — market Q&A, signal delivery, chart photo analysis |
| [**Signal Engine**](src/agents/signal-engine.ts) | TypeScript | BUY/SELL/HOLD signals with confidence score and risk level |
| [**Technical Analysis**](src/agents/technical-analysis.ts) | TypeScript | RSI, MACD, BB, EMA, ATR — pure TypeScript, no TA libraries |
| [**Market Analyst**](src/agents/market-analyst.ts) | TypeScript | Deep multi-factor market analysis using Claude Sonnet |
| [**On-chain Agent**](src/agents/onchain-agent.ts) | TypeScript | Solana wallet monitoring, transaction parsing |
| [**Whale Tracker**](src/agents/whale-tracker.ts) | TypeScript | Monitors large wallets, alerts on $50k+ moves |
| [**Post Writer**](src/agents/post-writer.ts) | TypeScript | Natural human-style post generator for Twitter/X |
| [**Signal History**](src/agents/signal-history.ts) | TypeScript | Append-only JSON signal log with stats and filters |
| [**Auto Poster**](poster/) | TypeScript | Automated signal posting to Twitter/X |
| [**Solana SDK**](sdk/) | TypeScript | On-chain data fetcher — prices, wallets, transactions |
| [**Signal CLI**](cli/) | Go | Lightweight CLI for terminal-native signal checks |
| [**Core SDK**](core/) | Rust | High-performance signal computation and data processing |

---

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome screen with quick-action keyboard |
| `/signal $TOKEN` | BUY/SELL/HOLD signal with confidence score |
| `/ta $TOKEN` | Full technical analysis — RSI, MACD, BB, EMA |
| `/analyze $TOKEN` | Deep AI market analysis (Claude Sonnet) |
| `/post $TOKEN` | Generate a ready-to-copy Twitter/X post |
| `/history` | Last 10 signals generated |
| `/help` | Show all commands |

**Send a chart photo** → instant AI chart analysis with signal, key levels, and pattern recognition.

---

## AI Providers

Orin.LAB supports multiple AI backends — switch with one env var:

| Provider | Setup | Notes |
|----------|-------|-------|
| **Anthropic** | `ANTHROPIC_API_KEY` | Best quality, Claude Haiku/Sonnet |
| **DeepInfra** | `DEEPINFRA_API_KEY` | Free tier available, Llama 3.1 70B |
| **OpenAI** | `OPENAI_API_KEY` | Any OpenAI-compatible endpoint |
| **OpenRouter** | `OPENAI_API_KEY` + `OPENAI_BASE_URL` | Access to 100+ models |

```env
# Switch provider in ~/.orinlab/.env
AI_PROVIDER=deepinfra
DEEPINFRA_API_KEY=your_key
DEEPINFRA_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
```

---

## For Developers

Clone and run locally:

```bash
git clone https://github.com/cryptosignalorg/crypto-ai-research.git
cd crypto-ai-research
npm install
cp .env.example .env   # fill in your keys
npm run build
npx orinlab signal
```

### Run tests

```bash
npm test
npm run test:pipeline
```

### Project Structure

```
Orin.LAB/
├── src/                ← TypeScript core (agents, bot, CLI, utils)
│   ├── agents/         ← signal engine, TA, whale tracker, etc.
│   ├── bot/            ← Telegram bot
│   ├── cli/            ← orinlab CLI entry point
│   └── redis/          ← cache layer
├── poster/             ← TypeScript auto poster
├── sdk/                ← TypeScript Solana SDK
├── cli/                ← Go signal CLI
├── core/               ← Rust core SDK
├── tests/              ← Vitest unit tests
├── scripts/            ← pipeline smoke tests
└── .github/            ← CI/CD, CodeQL, issue templates
```

---

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a PR against `main`

---

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md). Do **not** open a public issue.

---

## Disclaimer

Orin.LAB is experimental software for research purposes.

- AI signals are **not financial advice**
- Always DYOR
- Never share your private key
- Use at your own risk

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Orin.LAB** · AI Research Lab for Crypto Markets

Built on [Solana](https://solana.com) · Powered by [Claude AI](https://anthropic.com)

[`$ORNL`](https://pump.fun/coin/6Nfn8vpwEmGSyjYgHMctt9hrsB6TBa5TT1WjonRpump) · CA: `6Nfn8vpwEmGSyjYgHMctt9hrsB6TBa5TT1WjonRpump` · [GitHub](https://github.com/cryptosignalorg/crypto-ai-research)

</div>
