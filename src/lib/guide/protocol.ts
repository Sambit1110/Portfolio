// Request/response shapes and limits shared by the AI Core panel and the
// /api/guide route. Contains no secrets, so it is safe in the browser bundle.

export type ChatMessage = { role: "user" | "assistant"; text: string };

export type GuideRequest = { messages: ChatMessage[] };

export type GuideResponse = { reply: string } | { error: "invalid" | "rate_limited" | "unavailable" };

export const GUIDE_LIMITS = {
  // Longest question a visitor can send.
  questionChars: 500,
  // Previous assistant replies are trimmed to this length when sent back.
  replyChars: 2000,
  // Messages sent per request (odd, so the window starts on a visitor turn).
  historyMessages: 9,
  // Whole request body, in bytes.
  bodyBytes: 24_000,
};

// Server-side validation. Returns the cleaned messages, or null if invalid.
export function parseGuideRequest(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as GuideRequest).messages)) return null;
  const raw = (body as GuideRequest).messages;
  if (raw.length === 0 || raw.length > GUIDE_LIMITS.historyMessages) return null;

  const messages: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.text !== "string") return null;
    const text = m.text.trim();
    const limit = m.role === "user" ? GUIDE_LIMITS.questionChars : GUIDE_LIMITS.replyChars;
    if (text.length === 0 || text.length > limit) return null;
    messages.push({ role: m.role, text });
  }
  // The newest message must be the visitor's question.
  return messages[messages.length - 1].role === "user" ? messages : null;
}
