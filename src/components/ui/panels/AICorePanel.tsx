"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ZONE_BY_ID } from "@/content/zones";
import {
  GUIDE_GREETING,
  GUIDE_SUGGESTIONS,
  answerToText,
  askGuide,
  isGuideLive,
  type ChatMessage,
  type GuideAnswer,
} from "@/lib/guide";
import { GUIDE_LIMITS } from "@/lib/guide/protocol";
import { audio } from "@/audio/AudioManager";
import { runtime } from "@/stores/runtime";
import { PanelHeader } from "./PanelHeader";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: GuideAnswer; fallback: boolean };

// What the status line may claim. Nothing is verified until an answer comes
// back: "live" only after Gemini has answered, "offline" when the server has no
// model configured or the last live request failed.
type GuideStatus = "available" | "live" | "offline";
const STATUS_TEXT: Record<GuideStatus, string> = {
  available: "AI guide available",
  live: "Live",
  offline: "Offline guide",
};

const toHistory = (messages: Message[]): ChatMessage[] =>
  messages.map((m) => (m.role === "user" ? { role: "user", text: m.text } : { role: "assistant", text: answerToText(m.answer) }));

function GuideBubble({ children, glow = true }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <div
      className={`mr-6 rounded-2xl rounded-tl-sm bg-ink px-4 py-3 text-[15px] leading-relaxed text-cream ${
        glow ? "shadow-[0_0_0_1px_rgba(93,224,230,0.18),0_6px_22px_rgba(93,224,230,0.12)]" : ""
      }`}
    >
      {children}
    </div>
  );
}

// The AI Core's conversation. Lives only while the panel is open; every question
// goes to our /api/guide route, with the static guide as a fallback.
export function AICorePanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  // Whether the server has a model configured (null until it has said).
  const [live, setLive] = useState<boolean | null>(null);
  // Outcome of the latest live request, once there has been one.
  const [outcome, setOutcome] = useState<"live" | "offline" | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    isGuideLive().then((value) => !cancelled && setLive(value));
    return () => {
      cancelled = true;
    };
  }, []);

  // Let the AI Core in the world show that it's thinking.
  useEffect(() => {
    runtime.guideThinking = pending;
    return () => {
      runtime.guideThinking = false;
    };
  }, [pending]);

  // Keep the newest message in view.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending]);

  // When the phone keyboard opens the sheet shrinks: keep the newest message in
  // view (on focus, and whenever the visible viewport resizes).
  useEffect(() => {
    const viewport = window.visualViewport;
    const pin = () => end.current?.scrollIntoView({ block: "end" });
    viewport?.addEventListener("resize", pin);
    return () => viewport?.removeEventListener("resize", pin);
  }, []);

  // Grow the input with its content, up to a few lines.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  const send = async (text: string) => {
    const question = text.trim().slice(0, GUIDE_LIMITS.questionChars);
    if (!question || pending) return;
    const userMessage: Message = { id: nextId.current++, role: "user", text: question };
    const history = toHistory([...messages, userMessage]);
    setMessages((m) => [...m, userMessage]);
    setDraft("");
    setPending(true);
    const turn = await askGuide(history, live);
    // A short chime when an answer arrives; a softer falling tone if the live
    // guide was expected but failed (offline answers are a normal reply).
    audio.play(turn.source === "fallback" && live ? "fail" : "reply");
    // A request was only attempted if the server didn't rule the model out.
    if (live !== false) setOutcome(turn.source === "ai" ? "live" : "offline");
    setMessages((m) => [...m, { id: nextId.current++, role: "assistant", answer: turn.answer, fallback: turn.source === "fallback" }]);
    setPending(false);
    input.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter keeps the newline. Ignore Enter while an IME is composing.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const remaining = GUIDE_LIMITS.questionChars - draft.length;
  const status: GuideStatus = live === false ? "offline" : (outcome ?? "available");

  return (
    <div className="flex min-h-full flex-col">
      <PanelHeader eyebrow={ZONE_BY_ID.ai.landmark} title="AI Core" />
      <p className="-mt-3 mb-4 flex items-center gap-2 text-xs text-rock" aria-live="polite">
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${status === "live" ? "animate-pulse bg-cyan shadow-[0_0_8px_rgba(93,224,230,0.9)]" : "bg-rock/40"}`}
        />
        {STATUS_TEXT[status]}
      </p>

      <div className="flex-1 rounded-2xl bg-sand/40 p-3">
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with the AI guide" className="space-y-3">
          <GuideBubble>
            {GUIDE_GREETING.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </GuideBubble>

          {messages.map((m) =>
            m.role === "user" ? (
              <p key={m.id} className="ml-10 rounded-2xl rounded-tr-sm border border-rock/10 bg-cream px-4 py-2.5 text-[15px] whitespace-pre-line text-ink">
                <span className="sr-only">You: </span>
                {m.text}
              </p>
            ) : (
              <div key={m.id}>
                {/* Only flag the fallback when the live guide was expected to answer. */}
                {m.fallback && live && (
                  <p className="mb-1.5 ml-1 text-xs text-rock">The live guide couldn&apos;t answer just now, so here is what the portfolio says:</p>
                )}
                <GuideBubble glow={!m.fallback}>
                  <span className="sr-only">Guide: </span>
                  <p className="whitespace-pre-line">{m.answer.text}</p>
                  {m.answer.items && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-cream/85">
                      {m.answer.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </GuideBubble>
              </div>
            ),
          )}

          {pending && (
            <GuideBubble>
              <span className="sr-only">The guide is typing</span>
              <span aria-hidden="true" className="flex gap-1.5 py-1">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="size-2 animate-bounce rounded-full bg-cyan" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </span>
            </GuideBubble>
          )}
          {/* Scroll anchor; the bottom margin keeps the newest message clear of the pinned input. */}
          <div ref={end} className="scroll-mb-36" />
        </div>

        {messages.length === 0 && (
          <ul aria-label="Suggested questions" className="mt-4 flex flex-wrap gap-2">
            {GUIDE_SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => send(suggestion)}
                  className="touch-manipulation rounded-full border border-cyan-ink/30 bg-cream/70 px-3 py-1.5 text-left text-[13px] text-cyan-ink pointer-coarse:px-3.5 pointer-coarse:py-2.5 pointer-coarse:text-sm transition hover:border-cyan-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-cyan-ink"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pinned flush to the bottom of the panel while the conversation scrolls.
          Sticky offsets respect the scroller's bottom padding, hence -bottom-6. */}
      <form
        className="sticky -bottom-6 -mx-7 -mb-6 mt-4 bg-cream/95 px-7 pt-3 pb-5 backdrop-blur-sm"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="guide-input" className="sr-only">
          Ask the AI guide about the portfolio
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-rock/20 bg-cream px-3 py-2 transition focus-within:border-cyan-ink focus-within:shadow-[0_0_0_3px_rgba(93,224,230,0.25)]">
          <textarea
            id="guide-input"
            ref={input}
            data-autofocus
            rows={1}
            value={draft}
            maxLength={GUIDE_LIMITS.questionChars}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setTimeout(() => end.current?.scrollIntoView({ block: "end" }), 300)}
            // The phone keyboard shows "Send" for its Enter key.
            enterKeyHint="send"
            placeholder="Ask about projects, skills, background…"
            aria-describedby="guide-input-hint"
            className="max-h-33 flex-1 resize-none bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-rock/60 pointer-coarse:text-base"
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label="Send question"
            className="grid size-9 shrink-0 touch-manipulation place-items-center rounded-full bg-ink text-cyan pointer-coarse:size-11 transition hover:bg-rock focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-current">
              <path d="M3.4 16.6 17 10 3.4 3.4l.1 5.1L13 10l-9.5 1.5z" />
            </svg>
          </button>
        </div>
        <p id="guide-input-hint" className="mt-1.5 flex justify-between text-[11px] text-rock">
          <span className="pointer-coarse:hidden">Enter to send · Shift+Enter for a new line</span>
          {remaining <= 100 && <span aria-live="polite">{remaining} characters left</span>}
        </p>
      </form>
    </div>
  );
}
