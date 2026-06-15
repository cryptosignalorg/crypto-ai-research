/**
 * Orin.LAB · AI Client
 * Unified provider adapter — Anthropic and OpenAI-compatible APIs.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";
const DEEPINFRA_MODEL = process.env.DEEPINFRA_MODEL ?? "meta-llama/Meta-Llama-3.1-70B-Instruct";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function aiProvider(): string {
  return (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
}

function openAiClient(baseUrl: string, apiKey: string): OpenAI {
  return new OpenAI({ baseURL: baseUrl, apiKey });
}

export async function chat(
  messages: ChatMessage[],
  system = "",
  maxTokens = 400,
  model?: string,
): Promise<string> {
  const provider = aiProvider();

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const useModel = model ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";
    const response = await client.messages.create({
      model: useModel,
      max_tokens: maxTokens,
      system,
      messages,
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  if (provider === "deepinfra") {
    const apiKey = process.env.DEEPINFRA_API_KEY ?? "";
    if (!apiKey) throw new Error("DEEPINFRA_API_KEY not set in .env");
    const client = openAiClient(DEEPINFRA_BASE_URL, apiKey);
    const useModel = model ?? DEEPINFRA_MODEL;
    const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (system) fullMessages.push({ role: "system", content: system });
    fullMessages.push(...messages);
    const response = await client.chat.completions.create({
      model: useModel,
      messages: fullMessages,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? "";
  }

  if (["openai", "openrouter", "together", "groq", "custom"].includes(provider)) {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    const baseUrl = process.env.OPENAI_BASE_URL ?? OPENAI_BASE_URL;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set in .env");
    const client = openAiClient(baseUrl, apiKey);
    const useModel = model ?? OPENAI_MODEL;
    const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (system) fullMessages.push({ role: "system", content: system });
    fullMessages.push(...messages);
    const response = await client.chat.completions.create({
      model: useModel,
      messages: fullMessages,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? "";
  }

  throw new Error(`Unknown AI_PROVIDER '${provider}'. Choose: anthropic | deepinfra | openai`);
}

export async function chatWithImage(
  imageB64: string,
  prompt: string,
  system = "",
  maxTokens = 600,
): Promise<string> {
  const provider = aiProvider();

  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageB64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  let client: OpenAI;
  let useModel: string;

  if (provider === "deepinfra") {
    const apiKey = process.env.DEEPINFRA_API_KEY ?? "";
    client = openAiClient(DEEPINFRA_BASE_URL, apiKey);
    useModel = process.env.DEEPINFRA_VISION_MODEL ?? "meta-llama/Llama-3.2-90B-Vision-Instruct";
  } else {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    const baseUrl = process.env.OPENAI_BASE_URL ?? OPENAI_BASE_URL;
    client = openAiClient(baseUrl, apiKey);
    useModel = process.env.OPENAI_MODEL ?? "gpt-4o";
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({
    role: "user",
    content: [
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
      { type: "text", text: prompt },
    ],
  });

  const response = await client.chat.completions.create({
    model: useModel,
    messages,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content ?? "";
}
