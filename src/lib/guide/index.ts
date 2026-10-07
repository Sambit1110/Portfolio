import { GUIDE_LIMITS, type ChatMessage, type GuideResponse } from "./protocol";
import { staticAnswer } from "./staticGuide";
import type { GuideAnswer } from "./types";

export type GuideTurn = {
  answer: GuideAnswer;
  // "ai" when Gemini answered; "fallback" when the static guide stepped in.
  source: "ai" | "fallback";
};

// Covers the server timeout plus one retry, then the static guide takes over.
const REQUEST_TIMEOUT_MS = 30_000;

// Asks the live guide through our own API route (never the provider directly).
// Any failure (offline, rate-limited, provider down, timeout) falls back to the
// static guide so the AI Core always answers something true. When the server
// has no model configured (`live === false`) it skips the request entirely.
export async function askGuide(history: ChatMessage[], live: boolean | null = null): Promise<GuideTurn> {
  const question = history[history.length - 1].text;
  if (live === false) return { answer: staticAnswer(question), source: "fallback" };
  try {
    const response = await fetch("/api/guide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-GUIDE_LIMITS.historyMessages) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = (await response.json()) as GuideResponse;
    if (response.ok && "reply" in data) return { answer: { text: data.reply }, source: "ai" };
  } catch {
    // Network error or timeout: fall through to the static guide.
  }
  return { answer: staticAnswer(question), source: "fallback" };
}

// Whether the server has a live model configured. False on any error.
export async function isGuideLive(): Promise<boolean> {
  try {
    const response = await fetch("/api/guide", { signal: AbortSignal.timeout(5_000) });
    return response.ok && ((await response.json()) as { live?: boolean }).live === true;
  } catch {
    return false;
  }
}

// Flattens an answer to plain text for the conversation history.
export function answerToText(answer: GuideAnswer) {
  return [answer.text, ...(answer.items ?? []).map((item) => `- ${item}`)].join("\n").slice(0, GUIDE_LIMITS.replyChars);
}

export { GUIDE_GREETING, GUIDE_SUGGESTIONS } from "./copy";
export type { ChatMessage } from "./protocol";
export type { GuideAnswer } from "./types";
