import { NextResponse } from "next/server";
import { askGemini, isGeminiConfigured } from "@/lib/guide/gemini";
import { GUIDE_LIMITS, parseGuideRequest, type GuideResponse } from "@/lib/guide/protocol";
import { allowRequest } from "@/lib/guide/rateLimit";

// Upper bound for one request on serverless hosts: two Gemini attempts of 12 s
// each, plus margin. The client gives up at 30 s and answers offline.
export const maxDuration = 30;

// Answers are per visitor and per moment: never cache them anywhere.
const json = (body: GuideResponse | { live: boolean }, status = 200) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

// Reads the body as text, giving up as soon as it passes `limit` bytes, so an
// oversized or endless upload is never held in memory.
async function readBody(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

// Whether the live guide is available. Reveals nothing about the key itself.
export function GET() {
  return json({ live: isGeminiConfigured() });
}

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request))) return json({ error: "rate_limited" }, 429);

  // JSON only. This also means another site can't make a visitor's browser
  // post here: a cross-origin JSON request needs CORS approval, never given.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "invalid" }, 415);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > GUIDE_LIMITS.bodyBytes) return json({ error: "invalid" }, 413);

  let body: unknown;
  try {
    const raw = await readBody(request, GUIDE_LIMITS.bodyBytes);
    if (raw === null) return json({ error: "invalid" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid" }, 400);
  }

  const messages = parseGuideRequest(body);
  if (!messages) return json({ error: "invalid" }, 400);

  if (!isGeminiConfigured()) return json({ error: "unavailable" }, 503);

  try {
    return json({ reply: await askGemini(messages) });
  } catch (error) {
    // Log the failure type only; never echo provider errors to the client.
    const status = (error as { status?: number }).status;
    console.error(`[guide] Gemini request failed${status ? ` (HTTP ${status})` : ""}: ${(error as Error).name}`);
    return json({ error: "unavailable" }, 502);
  }
}
