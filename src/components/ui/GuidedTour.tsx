"use client";

import { useEffect, useState } from "react";
import { TOUR_OUTRO, TOUR_STOPS } from "@/lib/tour";
import { useWorldStore, type GuidedTour } from "@/stores/worldStore";

type Callout = { label: string; text: string };

// How long the closing line stays before it fades.
const OUTRO_MS = 2400;

// What the tour is saying right now, if anything.
function useCallout(tour: GuidedTour | null): Callout | null {
  const [faded, setFaded] = useState<GuidedTour | null>(null);
  const outro = tour?.phase === "ended" && tour.completed;
  useEffect(() => {
    if (!outro) return;
    const timer = setTimeout(() => setFaded(tour), OUTRO_MS);
    return () => clearTimeout(timer);
  }, [outro, tour]);

  if (tour?.phase === "touring" && tour.callout) {
    const { label, text } = TOUR_STOPS[tour.stop];
    return { label, text };
  }
  if (outro && faded !== tour) return { label: "Guided tour", text: TOUR_OUTRO };
  return null;
}

// What screen readers hear: that the tour is running and how to leave it, each
// stop's line, and that control is back when it ends.
function announcement(tour: GuidedTour | null) {
  if (!tour) return "";
  if (tour.phase === "ended") return tour.completed ? `${TOUR_OUTRO} You're in control.` : "Guided tour stopped. You're in control.";
  const { label, text } = TOUR_STOPS[tour.stop];
  const line = tour.callout ? `${label}: ${text}` : "";
  return tour.stop === 0 ? `Guided tour started. Press Escape or any movement key to take control. ${line}` : line;
}

// The guided tour's only UI: a short line at each stop, a way out, and its
// announcements. Nothing here blocks the world: any movement takes control.
export function GuidedTourOverlay({ touch }: { touch: boolean }) {
  const tour = useWorldStore((s) => s.guidedTour);
  const endTour = useWorldStore((s) => s.endTour);
  const touring = tour?.phase === "touring";
  const current = useCallout(tour);

  // Keep the last line on screen while it fades out.
  const [shown, setShown] = useState<Callout | null>(null);
  if (current && (current.label !== shown?.label || current.text !== shown?.text)) setShown(current);

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {announcement(tour)}
      </span>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          current ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        }`}
        style={{ top: "calc(max(1rem, env(safe-area-inset-top)) + 3.75rem)" }}
      >
        {shown && (
          <div className="rounded-2xl bg-ink/70 px-5 py-3 text-center backdrop-blur-sm">
            <p className="text-[11px] leading-none font-medium tracking-[0.24em] text-cyan uppercase">{shown.label}</p>
            <p className="mt-2 text-[15px] leading-snug text-cream">{shown.text}</p>
          </div>
        )}
      </div>

      {touring && (
        <button
          type="button"
          onClick={() => endTour(false)}
          aria-label="Skip the guided tour"
          className={`pointer-events-auto absolute flex touch-manipulation items-center gap-2 rounded-full bg-ink/70 px-4 py-2 text-sm font-medium text-cream backdrop-blur-sm transition select-none hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan pointer-coarse:min-h-11 ${
            touch ? "" : "left-1/2 -translate-x-1/2"
          }`}
          style={
            touch
              ? { right: "max(1.25rem, env(safe-area-inset-right))", bottom: "max(1.75rem, env(safe-area-inset-bottom))" }
              : { bottom: "2rem" }
          }
        >
          Skip tour
          <span aria-hidden="true" className="text-cream/60 max-sm:hidden pointer-coarse:hidden">
            Esc
          </span>
        </button>
      )}
    </>
  );
}
