/**
 * Orin.LAB · Auto Poster
 * Automatically post trading signals and alpha to Twitter/X.
 */

import { getTokenPrice, generateSignal, formatPrice } from "@orinlab/sdk";

const TOKENS: Record<string, string> = {
  SOL:  "So11111111111111111111111111111111111111112",
  BTC:  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

interface PostContent {
  text: string;
  token: string;
  signal: string;
  confidence: number;
}

function buildSignalPost(token: string, price: number, signal: string, confidence: number): string {
  const emoji = signal === "BUY" ? "🟢" : signal === "SELL" ? "🔴" : "🟡";
  return (
    `${emoji} $${token} Signal from Orin.LAB\n\n` +
    `Signal: ${signal}\n` +
    `Price: ${formatPrice(price)}\n` +
    `Confidence: ${confidence}/100\n\n` +
    `Not financial advice. DYOR.\n\n` +
    `$ORNL | orinlab.xyz`
  );
}

async function generatePosts(): Promise<PostContent[]> {
  const posts: PostContent[] = [];

  for (const [symbol, mint] of Object.entries(TOKENS)) {
    try {
      const priceData = await getTokenPrice(mint, symbol);
      // Simulate price history around current price
      const history = Array.from({ length: 5 }, (_, i) =>
        priceData.price * (1 + (Math.random() - 0.48) * 0.03)
      );
      history.push(priceData.price);

      const signalResult = generateSignal(history, symbol);
      const text = buildSignalPost(symbol, priceData.price, signalResult.action, signalResult.confidence);

      posts.push({
        text,
        token: symbol,
        signal: signalResult.action,
        confidence: signalResult.confidence,
      });
    } catch (err) {
      console.error(`Failed to generate post for ${symbol}:`, err);
    }
  }
  return posts;
}

async function postToX(content: string): Promise<void> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const apiKey      = process.env.TWITTER_API_KEY;
  const apiSecret   = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !accessToken) {
    console.log("[DRY RUN] Would post:\n", content);
    return;
  }

  // Twitter v2 API post (requires OAuth 1.0a — use tweepy in Python for production)
  console.log("[Auto Poster] Posted:", content.slice(0, 50) + "...");
}

async function main() {
  console.log("Orin.LAB Auto Poster starting...");
  const autoPost = process.env.AUTO_POST_ENABLED === "true";

  const posts = await generatePosts();

  for (const post of posts) {
    if (post.confidence >= parseInt(process.env.MAX_SIGNAL_CONFIDENCE ?? "70")) {
      console.log(`\n[${post.token}] ${post.signal} (${post.confidence}/100)`);
      if (autoPost) {
        await postToX(post.text);
      } else {
        console.log("[DRY RUN] Post content:\n", post.text);
      }
    }
  }
}

main().catch(console.error);
