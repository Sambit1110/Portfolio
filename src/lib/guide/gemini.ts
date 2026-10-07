import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./protocol";
import { getSystemInstruction } from "./prompt";

// Server-only: the API key is read from the server environment and never leaves
// it. The "server-only" import makes any client-side import a build error.

// Flash-Lite: answers from a small fixed context don't need a larger model, and
// it responds several times faster. Override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const TIMEOUT_MS = 12_000;
// The SDK's default is 5 attempts with up to 60 s back-off, including on quota
// errors. Retry once, quickly, and only on server-side failures.
const RETRY = { attempts: 2, initialDelay: 0.6, maxDelay: 2, httpStatusCodes: [500, 502, 503, 504] };

let client: GoogleGenAI | null = null;

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function askGemini(messages: ChatMessage[]): Promise<string> {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: MODEL,
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    config: {
      systemInstruction: getSystemInstruction(),
      // Low temperature: answers should stay close to the portfolio context.
      temperature: 0.3,
      // Generous ceiling so a thinking model never runs out mid-answer; the
      // system prompt keeps replies short.
      maxOutputTokens: 2048,
      httpOptions: { timeout: TIMEOUT_MS, retryOptions: RETRY },
    },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned an empty reply");
  return text;
}
